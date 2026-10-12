import type { User } from './types';

export type SignOutReason = 'logout' | 'expired';

export type SessionState =
  | { status: 'unknown' }
  | { status: 'anonymous'; reason: SignOutReason | null }
  | { status: 'authenticated'; user: User };

export interface SessionStore {
  getState: () => SessionState;
  subscribe: (listener: () => void) => () => void;
  signIn: (user: User) => void;
  signOut: (reason: SignOutReason) => void;
}

export function createSessionStore(): SessionStore {
  let state: SessionState = { status: 'unknown' };
  const listeners = new Set<() => void>();

  const setState = (next: SessionState) => {
    state = next;
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    signIn(user) {
      setState({ status: 'authenticated', user });
    },
    signOut(reason) {
      if (state.status === 'anonymous') return;
      setState({ status: 'anonymous', reason: state.status === 'authenticated' ? reason : null });
    },
  };
}
