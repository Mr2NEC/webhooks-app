import { createContext, useContext, type ReactNode } from 'react';
import type { HttpClient } from './http-client';

const HttpClientContext = createContext<HttpClient | null>(null);

export function HttpClientProvider({ client, children }: { client: HttpClient; children: ReactNode }) {
  return <HttpClientContext value={client}>{children}</HttpClientContext>;
}

export function useHttpClient(): HttpClient {
  const client = useContext(HttpClientContext);
  if (!client) throw new Error('useHttpClient must be used within HttpClientProvider');
  return client;
}
