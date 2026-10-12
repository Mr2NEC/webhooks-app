import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttpClient } from '@/shared/api/http-client-context';
import { fetchWebhook, fetchWebhooks, updateWebhook } from './api';
import type { WebhookInput, WebhookListParams } from './types';

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (params: WebhookListParams) => [...webhookKeys.lists(), params] as const,
  detail: (id: number) => [...webhookKeys.all, 'detail', id] as const,
};

export function useWebhookList(params: WebhookListParams) {
  const http = useHttpClient();
  return useQuery({
    queryKey: webhookKeys.list(params),
    queryFn: ({ signal }) => fetchWebhooks(http, params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useWebhook(id: number) {
  const http = useHttpClient();
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => fetchWebhook(http, id, signal),
  });
}

export function useUpdateWebhook(id: number) {
  const http = useHttpClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WebhookInput) => updateWebhook(http, id, input),
    onSuccess: (webhook) => {
      queryClient.setQueryData(webhookKeys.detail(id), webhook);
      return queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
    },
  });
}
