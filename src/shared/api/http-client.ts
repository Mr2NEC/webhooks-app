import { singleFlight } from '../lib/single-flight';
import { ApiError, SessionExpiredError, toApiError } from './errors';

export type Transport = (request: Request) => Promise<Response>;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: HttpMethod;
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  skipSessionRefresh?: boolean;
}

export interface HttpClient {
  request<T = void>(path: string, options?: RequestOptions): Promise<T>;
}

export interface HttpClientOptions {
  baseUrl: string;
  refreshSession: (client: HttpClient) => Promise<void>;
  onSessionExpired: () => void;
  transport?: Transport;
}

const CSRF_HEADER = 'X-CSRF-TOKEN';
const CSRF_PROTECTED_METHODS: ReadonlySet<HttpMethod> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const BASE_HEADERS = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };

type Attempt = () => Promise<Response>;

export function createHttpClient({
  baseUrl,
  refreshSession,
  onSessionExpired,
  transport = (request) => fetch(request),
}: HttpClientOptions): HttpClient {
  let csrfToken: string | null = null;
  let sessionEpoch = 0;

  const buildUrl = (path: string, query: RequestOptions['query'] = {}): URL => {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    return url;
  };

  const refreshCsrfToken = singleFlight(async () => {
    const response = await transport(new Request(buildUrl('/csrf'), { headers: BASE_HEADERS }));
    if (!response.ok) throw await toApiError(response);
    const token = response.headers.get(CSRF_HEADER);
    if (!token) throw new ApiError(response.status, 'UnknownError', 'CSRF token is missing in the response');
    csrfToken = token;
    return token;
  });

  const getCsrfToken = async (): Promise<string> => csrfToken ?? refreshCsrfToken();

  const rotateSession = singleFlight(async () => {
    try {
      await refreshSession(sessionlessClient);
      sessionEpoch += 1;
    } catch (error) {
      onSessionExpired();
      throw new SessionExpiredError({ cause: error });
    }
  });

  const retryOnCsrfMismatch =
    (attempt: Attempt): Attempt =>
    async () => {
      const response = await attempt();
      if (response.status !== 419) return response;

      await refreshCsrfToken();
      return attempt();
    };

  const retryOnUnauthorized =
    (attempt: Attempt, signal?: AbortSignal): Attempt =>
    async () => {
      const epoch = sessionEpoch;
      const response = await attempt();
      if (response.status !== 401) return response;

      if (epoch === sessionEpoch) await rotateSession();
      signal?.throwIfAborted();

      const retried = await attempt();
      if (retried.status === 401) {
        onSessionExpired();
        throw new SessionExpiredError();
      }
      return retried;
    };

  async function request<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', query, body, signal, skipSessionRefresh = false } = options;
    const url = buildUrl(path, query);
    const payload = body === undefined ? undefined : JSON.stringify(body);

    const send: Attempt = async () => {
      const token = await getCsrfToken();
      const headers = new Headers({ ...BASE_HEADERS, ...options.headers });
      if (payload !== undefined) headers.set('Content-Type', 'application/json');
      if (CSRF_PROTECTED_METHODS.has(method)) headers.set(CSRF_HEADER, token);
      return transport(new Request(url, { method, headers, body: payload, signal }));
    };

    const sendWithCsrfRetry = retryOnCsrfMismatch(send);
    const attempt = skipSessionRefresh ? sendWithCsrfRetry : retryOnUnauthorized(sendWithCsrfRetry, signal);

    const response = await attempt();
    if (!response.ok) throw await toApiError(response);
    return parseBody<T>(response);
  }

  const sessionlessClient: HttpClient = {
    request: (path, options) => request(path, { ...options, skipSessionRefresh: true }),
  };

  return { request };
}

async function parseBody<T>(response: Response): Promise<T> {
  const isJson = response.headers.get('Content-Type')?.includes('application/json') ?? false;
  if (response.status === 204 || !isJson) return undefined as T;
  return (await response.json()) as T;
}
