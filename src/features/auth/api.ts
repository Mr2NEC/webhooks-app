import type { HttpClient } from '@/shared/api/http-client';
import type { Credentials, User } from './types';

const AUTH = { skipSessionRefresh: true } as const;

export function login(
  http: HttpClient,
  credentials: Credentials & { fingerprint: string },
  captchaToken: string,
): Promise<{ device_session_token: string }> {
  return http.request('/auth/login', {
    ...AUTH,
    method: 'POST',
    body: credentials,
    headers: { 'X-Captcha-Token': captchaToken },
  });
}

export function issueSession(
  http: HttpClient,
  body: { device_session_token: string; fingerprint: string },
): Promise<void> {
  return http.request('/auth/token/issue', { ...AUTH, method: 'POST', body });
}

export function rotateSession(http: HttpClient, fingerprint: string): Promise<void> {
  return http.request('/auth/token/rotate', { ...AUTH, method: 'POST', body: { fingerprint } });
}

export function revokeSession(http: HttpClient, fingerprint: string): Promise<void> {
  return http.request('/auth/token/revoke', { ...AUTH, method: 'POST', body: { fingerprint } });
}

export function fetchCurrentUser(http: HttpClient, signal?: AbortSignal): Promise<User> {
  return http.request('/v1/me', { signal });
}
