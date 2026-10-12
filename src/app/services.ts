import { QueryClient } from '@tanstack/react-query';
import { rotateSession } from '@/features/auth/api';
import { createAuthService, type AuthService } from '@/features/auth/auth-service';
import { createSessionStore, type SessionStore } from '@/features/auth/session-store';
import { isApiError, isSessionExpiredError } from '@/shared/api/errors';
import { createHttpClient, type HttpClient } from '@/shared/api/http-client';
import { API_PREFIX } from '@/shared/config';
import { getFingerprint } from '@/shared/lib/fingerprint';

export interface AppServices {
  http: HttpClient;
  session: SessionStore;
  auth: AuthService;
  queryClient: QueryClient;
}

const MAX_NETWORK_RETRIES = 2;

export function createAppServices(): AppServices {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: (failureCount, error) =>
          !isApiError(error) && !isSessionExpiredError(error) && failureCount < MAX_NETWORK_RETRIES,
      },
    },
  });

  const session = createSessionStore();

  const http = createHttpClient({
    baseUrl: new URL(API_PREFIX, window.location.origin).href,
    refreshSession: (client) => rotateSession(client, getFingerprint()),
    onSessionExpired: () => {
      auth.endSession('expired');
    },
  });

  const auth = createAuthService({ http, session, queryClient, getFingerprint });

  return { http, session, auth, queryClient };
}
