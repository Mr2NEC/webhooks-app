import { MantineProvider } from '@mantine/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from '@/features/auth/auth-context';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { WebhookEditModal } from '@/features/webhooks/WebhookEditModal';
import { WebhooksListPage } from '@/features/webhooks/WebhooksListPage';
import { HttpClientProvider } from '@/shared/api/http-client-context';
import { AppLayout } from './AppLayout';
import type { AppServices } from './services';
import { theme } from './theme';

export function App({ services }: { services: AppServices }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      <QueryClientProvider client={services.queryClient}>
        <HttpClientProvider client={services.http}>
          <AuthProvider auth={services.auth} session={services.session}>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<AppLayout />}>
                    <Route path="/webhooks" element={<WebhooksListPage />}>
                      <Route path=":id" element={<WebhookEditModal />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/webhooks" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </HttpClientProvider>
      </QueryClientProvider>
    </MantineProvider>
  );
}
