import '@mantine/core/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createAppServices } from './services';

async function start() {
  const { worker } = await import('@/mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass', quiet: import.meta.env.PROD });

  const services = createAppServices();
  void services.auth.bootstrap();

  const root = document.getElementById('root');
  if (!root) throw new Error('Root element #root not found');
  createRoot(root).render(
    <StrictMode>
      <App services={services} />
    </StrictMode>,
  );
}

void start();
