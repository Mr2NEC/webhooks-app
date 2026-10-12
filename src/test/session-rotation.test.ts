import { http as mswHttp } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCurrentUser, issueSession, login, revokeSession, rotateSession } from '@/features/auth/api';
import { fetchWebhooks, updateWebhook } from '@/features/webhooks/api';
import { MOCK_CREDENTIALS, SESSION_TTL_MS } from '@/mocks/db';
import { createMockApi } from '@/mocks/handlers';
import { apiError } from '@/mocks/responses';
import { SessionExpiredError } from '@/shared/api/errors';
import { createHttpClient, type HttpClient } from '@/shared/api/http-client';
import { API_PREFIX } from '@/shared/config';

const BASE_URL = `http://localhost${API_PREFIX}`;
const FINGERPRINT = '0123456789abcdef0123456789abcdef';

function createManualClock() {
  let now = Date.UTC(2026, 0, 1);
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const clock = createManualClock();
const server = setupServer();
let mockApi = createMockApi({ clock });

function recordTraffic() {
  const log: string[] = [];
  server.events.on('response:mocked', ({ request, response }) => {
    const path = new URL(request.url).pathname.replace(API_PREFIX, '');
    log.push(`${request.method} ${path} → ${response.status}`);
  });
  return {
    log,
    count: (entry: string) => log.filter((line) => line.startsWith(entry)).length,
  };
}

function createClient(onSessionExpired = vi.fn()) {
  const client = createHttpClient({
    baseUrl: BASE_URL,
    refreshSession: (sessionless) => rotateSession(sessionless, FINGERPRINT),
    onSessionExpired,
  });
  return { client, onSessionExpired };
}

async function signIn(client: HttpClient) {
  const { device_session_token } = await login(
    client,
    { ...MOCK_CREDENTIALS, fingerprint: FINGERPRINT },
    'test-captcha',
  );
  await issueSession(client, { device_session_token, fingerprint: FINGERPRINT });
}

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  mockApi = createMockApi({ clock });
  server.resetHandlers(...mockApi.handlers);
  server.events.removeAllListeners();
});

afterAll(() => {
  server.close();
});

describe('session refresh', () => {
  it('shares one rotate between parallel 401s and retries both requests', async () => {
    const { client, onSessionExpired } = createClient();
    await signIn(client);
    clock.advance(SESSION_TTL_MS + 1_000);
    const traffic = recordTraffic();

    const [user, list] = await Promise.all([
      fetchCurrentUser(client),
      fetchWebhooks(client, { page: 1, limit: 10, search: '' }),
    ]);

    expect(user.email).toBe(MOCK_CREDENTIALS.email);
    expect(list.data).toHaveLength(10);
    expect(traffic.count('POST /auth/token/rotate')).toBe(1);
    expect(traffic.log.filter((line) => line.startsWith('GET /v1/me'))).toEqual([
      'GET /v1/me → 401',
      'GET /v1/me → 200',
    ]);
    expect(traffic.log.filter((line) => line.startsWith('GET /v1/webhooks'))).toEqual([
      'GET /v1/webhooks → 401',
      'GET /v1/webhooks → 200',
    ]);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('ends the session once when the shared rotate fails', async () => {
    const { client, onSessionExpired } = createClient();
    await signIn(client);
    await revokeSession(client, FINGERPRINT);
    const traffic = recordTraffic();

    const results = await Promise.allSettled([
      fetchCurrentUser(client),
      fetchWebhooks(client, { page: 1, limit: 10, search: '' }),
    ]);

    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    for (const result of results) {
      if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(SessionExpiredError);
    }
    expect(traffic.count('POST /auth/token/rotate → 400')).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('ends the session when the retried request gets 401 again', async () => {
    const { client, onSessionExpired } = createClient();
    await signIn(client);
    server.use(
      mswHttp.get(`*${API_PREFIX}/v1/me`, () => apiError('AuthenticationException', 'Unauthenticated.')),
    );
    const traffic = recordTraffic();

    await expect(fetchCurrentUser(client)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(traffic.count('GET /v1/me → 401')).toBe(2);
    expect(traffic.count('POST /auth/token/rotate → 200')).toBe(1);
    expect(onSessionExpired).toHaveBeenCalled();
  });
});

describe('CSRF', () => {
  it('fetches the token before the first request and sends it on POST/PUT', async () => {
    const { client } = createClient();
    const traffic = recordTraffic();

    await signIn(client);

    expect(traffic.log[0]).toBe('GET /csrf → 204');
    expect(traffic.count('GET /csrf')).toBe(1);
  });

  it('re-fetches the token on 419 and retries the request once', async () => {
    const { client } = createClient();
    await signIn(client);
    mockApi.db.csrfToken = 'rotated-csrf-token';
    const traffic = recordTraffic();

    const updated = await updateWebhook(client, 1, { name: 'Renamed', url: 'https://example.com/hook' });

    expect(updated.name).toBe('Renamed');
    expect(traffic.log).toEqual(['PUT /v1/webhooks/1 → 419', 'GET /csrf → 204', 'PUT /v1/webhooks/1 → 200']);
  });

  it('does not retry a second 419', async () => {
    const { client } = createClient();
    await signIn(client);
    server.use(
      mswHttp.put(`*${API_PREFIX}/v1/webhooks/:id`, () =>
        apiError('TokenMismatchException', 'CSRF token mismatch.'),
      ),
    );
    const traffic = recordTraffic();

    await expect(updateWebhook(client, 1, { name: 'x', url: 'https://example.com' })).rejects.toMatchObject({
      status: 419,
    });
    expect(traffic.count('PUT /v1/webhooks/1 → 419')).toBe(2);
  });
});

describe('mock contract', () => {
  it('returns 422 with field errors for an invalid URL', async () => {
    const { client } = createClient();
    await signIn(client);

    await expect(updateWebhook(client, 1, { name: 'Hook', url: 'ftp://example.com' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { url: ['The url must be a valid URL.'] },
    });
  });

  it('applies case-insensitive search before paging', async () => {
    const { client } = createClient();
    await signIn(client);

    const list = await fetchWebhooks(client, { page: 1, limit: 10, search: 'ORDER PAID' });

    expect(list.data.every((hook) => hook.name.toLowerCase().includes('order paid'))).toBe(true);
    expect(list.paging.results).toEqual({ total: list.data.length, limitation: 10 });
  });

  it('rejects a protected request without a session', async () => {
    const { client } = createClient();
    await expect(fetchCurrentUser(client)).rejects.toBeInstanceOf(SessionExpiredError);
  });
});
