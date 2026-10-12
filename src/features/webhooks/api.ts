import type { HttpClient } from '@/shared/api/http-client';
import type { Webhook, WebhookInput, WebhookList, WebhookListParams } from './types';

export function fetchWebhooks(
  http: HttpClient,
  { page, limit, search }: WebhookListParams,
  signal?: AbortSignal,
): Promise<WebhookList> {
  return http.request('/v1/webhooks', { query: { page, limit, search }, signal });
}

export function fetchWebhook(http: HttpClient, id: number, signal?: AbortSignal): Promise<Webhook> {
  return http.request(`/v1/webhooks/${id}`, { signal });
}

export function updateWebhook(http: HttpClient, id: number, input: WebhookInput): Promise<Webhook> {
  return http.request(`/v1/webhooks/${id}`, { method: 'PUT', body: input });
}
