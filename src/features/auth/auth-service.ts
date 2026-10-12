import type { QueryClient } from '@tanstack/react-query';
import type { HttpClient } from '@/shared/api/http-client';
import { singleFlight } from '@/shared/lib/single-flight';
import * as authApi from './api';
import { getCaptchaToken } from './captcha';
import type { SessionStore, SignOutReason } from './session-store';
import type { Credentials } from './types';

export interface AuthService {
  bootstrap(): Promise<void>;
  login(credentials: Credentials): Promise<void>;
  logout(): Promise<void>;
  endSession(reason: SignOutReason): void;
}

interface AuthServiceDeps {
  http: HttpClient;
  session: SessionStore;
  queryClient: QueryClient;
  getFingerprint: () => string;
}

export function createAuthService({
  http,
  session,
  queryClient,
  getFingerprint,
}: AuthServiceDeps): AuthService {
  const endSession = (reason: SignOutReason) => {
    void queryClient.cancelQueries();
    queryClient.clear();
    session.signOut(reason);
  };

  return {
    bootstrap: singleFlight(async () => {
      try {
        session.signIn(await authApi.fetchCurrentUser(http));
      } catch {
        session.signOut('expired');
      }
    }),

    async login({ email, password }) {
      const fingerprint = getFingerprint();
      const { device_session_token } = await authApi.login(
        http,
        { email, password, fingerprint },
        await getCaptchaToken(),
      );
      await authApi.issueSession(http, { device_session_token, fingerprint });
      session.signIn(await authApi.fetchCurrentUser(http));
    },

    async logout() {
      try {
        await authApi.revokeSession(http, getFingerprint());
      } finally {
        endSession('logout');
      }
    },

    endSession,
  };
}
