import type { User } from '@/features/auth/types';
import type { Webhook } from '@/features/webhooks/types';

export const MOCK_CREDENTIALS = { email: 'demo@example.com', password: 'password123' } as const;

export const SESSION_TTL_MS = 30_000;

export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

interface ServerSession {
  fingerprint: string;
  expiresAt: number;
}

export interface MockDb {
  user: User & { password: string };
  webhooks: Webhook[];
  csrfToken: string;
  deviceTokens: Map<string, { fingerprint: string }>;
  session: ServerSession | null;
}

const EVENTS = [
  'Order created',
  'Order paid',
  'Order cancelled',
  'Contact subscribed',
  'Contact unsubscribed',
  'Message delivered',
  'Message failed',
];
const TARGETS = ['CRM', 'Analytics', 'Slack alerts', 'Billing'];

function seedWebhooks(count: number): Webhook[] {
  const start = Date.UTC(2025, 0, 1);
  return Array.from({ length: count }, (_, index) => {
    const event = EVENTS[index % EVENTS.length] ?? 'Event';
    const target = TARGETS[Math.floor(index / EVENTS.length) % TARGETS.length] ?? 'Target';
    const slug = `${event}-${target}`.toLowerCase().replace(/\s+/g, '-');
    return {
      id: index + 1,
      name: `${event} → ${target}`,
      url: `https://hooks.example.com/${slug}`,
      active: index % 3 !== 0,
      created_at: new Date(start + index * 86_400_000).toISOString(),
    };
  });
}

export function createMockDb(): MockDb {
  return {
    user: {
      id: 1,
      email: MOCK_CREDENTIALS.email,
      password: MOCK_CREDENTIALS.password,
      first_name: 'Demo',
      last_name: 'User',
      name: 'Demo User',
    },
    webhooks: seedWebhooks(28),
    csrfToken: 'mock-csrf-token-5f2c9a',
    deviceTokens: new Map(),
    session: null,
  };
}
