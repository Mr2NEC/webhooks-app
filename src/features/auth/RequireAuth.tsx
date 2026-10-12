import { Navigate, Outlet, useLocation, type Location } from 'react-router';
import { FullPageLoader } from '@/shared/ui/FullPageLoader';
import { useSession } from './auth-context';

export interface LoginRedirectState {
  from?: Location;
}

export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.status === 'unknown') return <FullPageLoader />;
  if (session.status === 'anonymous') {
    const state: LoginRedirectState = { from: location };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}
