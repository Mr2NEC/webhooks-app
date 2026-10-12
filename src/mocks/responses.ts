import { HttpResponse } from 'msw';
import type { ApiErrorBody, ApiErrorType, FieldErrors } from '@/shared/api/errors';

const ERROR_STATUS: Record<ApiErrorType, number> = {
  BadRequestException: 400,
  AuthenticationException: 401,
  NotFoundException: 404,
  TokenMismatchException: 419,
  ValidationException: 422,
};

export function apiError(type: ApiErrorType, message: string, payload?: FieldErrors) {
  const body: ApiErrorBody = { error: payload ? { type, message, payload } : { type, message } };
  return HttpResponse.json(body, { status: ERROR_STATUS[type] });
}

export const validationError = (payload: FieldErrors) =>
  apiError('ValidationException', 'The given data was invalid.', payload);

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

export function stringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}
