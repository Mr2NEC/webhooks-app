export type ApiErrorType =
  | 'BadRequestException'
  | 'AuthenticationException'
  | 'NotFoundException'
  | 'TokenMismatchException'
  | 'ValidationException';

export type FieldErrors = Record<string, string[]>;

export interface ApiErrorBody {
  error: {
    type: ApiErrorType;
    message: string;
    payload?: FieldErrors;
  };
}

export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly status: number,
    readonly type: ApiErrorType | 'UnknownError',
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
  }
}

export class SessionExpiredError extends Error {
  override readonly name = 'SessionExpiredError';

  constructor(options?: ErrorOptions) {
    super('Session expired', options);
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const isValidationError = (error: unknown): error is ApiError =>
  isApiError(error) && error.status === 422;

export const isNotFoundError = (error: unknown): error is ApiError =>
  isApiError(error) && error.status === 404;

export const isSessionExpiredError = (error: unknown): error is SessionExpiredError =>
  error instanceof SessionExpiredError;

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value;
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  if (!isApiErrorBody(body)) {
    return new ApiError(response.status, 'UnknownError', response.statusText || 'Request failed');
  }
  const { type, message, payload } = body.error;
  return new ApiError(response.status, type, message, payload);
}
