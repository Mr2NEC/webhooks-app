import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { AuthService } from './auth-service';
import type { SessionState, SessionStore } from './session-store';
import type { User } from './types';

interface AuthContextValue {
  auth: AuthService;
  session: SessionStore;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ auth, session, children }: AuthContextValue & { children: ReactNode }) {
  return <AuthContext value={{ auth, session }}>{children}</AuthContext>;
}

function useAuthContext(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Auth hooks must be used within AuthProvider');
  return value;
}

export function useAuth(): AuthService {
  return useAuthContext().auth;
}

export function useSession(): SessionState {
  const { session } = useAuthContext();
  return useSyncExternalStore(session.subscribe, session.getState);
}

export function useCurrentUser(): User {
  const session = useSession();
  if (session.status !== 'authenticated') throw new Error('useCurrentUser requires an authenticated session');
  return session.user;
}
