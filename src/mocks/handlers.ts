import { delay, http, HttpResponse } from 'msw';
import type { FieldErrors } from '@/shared/api/errors';
import { API_PREFIX } from '@/shared/config';
import { createMockDb, SESSION_TTL_MS, systemClock, type Clock, type MockDb } from './db';
import { apiError, readJsonBody, stringField, validationError } from './responses';

interface MockApiOptions {
  clock?: Clock;
  latencyMs?: number;
}

const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;
const MAX_PAGE_SIZE = 100;

const route = (path: string) => `*${API_PREFIX}${path}`;

export function createMockApi({ clock = systemClock, latencyMs = 0 }: MockApiOptions = {}) {
  const db: MockDb = createMockDb();

  async function guard(request: Request, { auth = false } = {}): Promise<Response | null> {
    if (latencyMs > 0) await delay(latencyMs);

    if (request.headers.get('X-Requested-With') !== 'XMLHttpRequest') {
      return apiError('BadRequestException', 'X-Requested-With header is required.');
    }
    if (['POST', 'PUT'].includes(request.method) && request.headers.get('X-CSRF-TOKEN') !== db.csrfToken) {
      return apiError('TokenMismatchException', 'CSRF token mismatch.');
    }
    if (auth && (db.session === null || clock.now() >= db.session.expiresAt)) {
      return apiError('AuthenticationException', 'Unauthenticated.');
    }
    return null;
  }

  const startSession = (fingerprint: string) => {
    db.session = { fingerprint, expiresAt: clock.now() + SESSION_TTL_MS };
  };

  const handlers = [
    http.get(route('/csrf'), async ({ request }) => {
      return (
        (await guard(request)) ??
        new HttpResponse(null, { status: 204, headers: { 'X-CSRF-TOKEN': db.csrfToken } })
      );
    }),

    http.post(route('/auth/login'), async ({ request }) => {
      const rejected = await guard(request);
      if (rejected) return rejected;
      if (!request.headers.get('X-Captcha-Token')) {
        return apiError('BadRequestException', 'Captcha token is required.');
      }

      const body = await readJsonBody(request);
      const email = stringField(body, 'email');
      const password = typeof body.password === 'string' ? body.password : '';
      const fingerprint = stringField(body, 'fingerprint');

      const errors: FieldErrors = {};
      if (!email) errors.email = ['The email field is required.'];
      if (!password) errors.password = ['The password field is required.'];
      if (!FINGERPRINT_PATTERN.test(fingerprint)) errors.fingerprint = ['The fingerprint is invalid.'];
      if (Object.keys(errors).length > 0) return validationError(errors);

      if (email.toLowerCase() !== db.user.email || password !== db.user.password) {
        return validationError({ password: ['The provided credentials are incorrect.'] });
      }

      const deviceSessionToken = crypto.randomUUID();
      db.deviceTokens.set(deviceSessionToken, { fingerprint });
      return HttpResponse.json({ device_session_token: deviceSessionToken });
    }),

    http.post(route('/auth/token/issue'), async ({ request }) => {
      const rejected = await guard(request);
      if (rejected) return rejected;

      const body = await readJsonBody(request);
      const token = stringField(body, 'device_session_token');
      const fingerprint = stringField(body, 'fingerprint');
      const issued = db.deviceTokens.get(token);
      if (!issued || issued.fingerprint !== fingerprint) {
        return validationError({ device_session_token: ['The device session token is invalid.'] });
      }

      db.deviceTokens.delete(token);
      startSession(fingerprint);
      return new HttpResponse(null, { status: 200 });
    }),

    http.post(route('/auth/token/rotate'), async ({ request }) => {
      const rejected = await guard(request);
      if (rejected) return rejected;

      const fingerprint = stringField(await readJsonBody(request), 'fingerprint');
      if (db.session?.fingerprint !== fingerprint) {
        return apiError('BadRequestException', 'No session to rotate.');
      }
      startSession(fingerprint);
      return new HttpResponse(null, { status: 200 });
    }),

    http.post(route('/auth/token/revoke'), async ({ request }) => {
      const rejected = await guard(request);
      if (rejected) return rejected;
      db.session = null;
      return new HttpResponse(null, { status: 204 });
    }),

    http.get(route('/v1/me'), async ({ request }) => {
      const rejected = await guard(request, { auth: true });
      if (rejected) return rejected;
      const { password: _password, ...user } = db.user;
      return HttpResponse.json(user);
    }),

    http.get(route('/v1/webhooks'), async ({ request }) => {
      const rejected = await guard(request, { auth: true });
      if (rejected) return rejected;

      const params = new URL(request.url).searchParams;
      const page = Number(params.get('page') ?? 1);
      const limit = Number(params.get('limit') ?? 10);
      const errors: FieldErrors = {};
      if (!Number.isInteger(page) || page < 1) errors.page = ['The page must be an integer of at least 1.'];
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
        errors.limit = [`The limit must be between 1 and ${MAX_PAGE_SIZE}.`];
      }
      if (Object.keys(errors).length > 0) return validationError(errors);

      const search = (params.get('search') ?? '').trim().toLowerCase();
      const matched = search
        ? db.webhooks.filter((hook) => hook.name.toLowerCase().includes(search))
        : db.webhooks;

      return HttpResponse.json({
        data: matched.slice((page - 1) * limit, page * limit),
        paging: {
          pages: { current: page, last: Math.max(1, Math.ceil(matched.length / limit)) },
          results: { total: matched.length, limitation: limit },
        },
      });
    }),

    http.get(route('/v1/webhooks/:id'), async ({ request, params }) => {
      const rejected = await guard(request, { auth: true });
      if (rejected) return rejected;

      const webhook = db.webhooks.find((hook) => String(hook.id) === params.id);
      return webhook ? HttpResponse.json(webhook) : apiError('NotFoundException', 'Webhook not found.');
    }),

    http.put(route('/v1/webhooks/:id'), async ({ request, params }) => {
      const rejected = await guard(request, { auth: true });
      if (rejected) return rejected;

      const webhook = db.webhooks.find((hook) => String(hook.id) === params.id);
      if (!webhook) return apiError('NotFoundException', 'Webhook not found.');

      const body = await readJsonBody(request);
      const name = stringField(body, 'name');
      const url = stringField(body, 'url');
      const errors: FieldErrors = {};
      if (!name) errors.name = ['The name field is required.'];
      else if (name.length > 255) errors.name = ['The name must not be greater than 255 characters.'];
      if (!url) errors.url = ['The url field is required.'];
      else if (!isHttpUrl(url)) errors.url = ['The url must be a valid URL.'];
      if (Object.keys(errors).length > 0) return validationError(errors);

      Object.assign(webhook, { name, url });
      return HttpResponse.json(webhook);
    }),
  ];

  return { handlers, db };
}

function isHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const { protocol, hostname } = new URL(value);
  return (protocol === 'http:' || protocol === 'https:') && hostname.length > 0;
}
