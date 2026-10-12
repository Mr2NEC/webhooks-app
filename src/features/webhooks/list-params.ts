import { WEBHOOKS_PAGE_SIZES } from '@/shared/config';
import type { WebhookListParams } from './types';

export const DEFAULT_LIST_PARAMS: WebhookListParams = { page: 1, limit: WEBHOOKS_PAGE_SIZES[0], search: '' };

export function parseListParams(searchParams: URLSearchParams): WebhookListParams {
  const rawPage = searchParams.get('page');
  const page = rawPage !== null && /^\d+$/.test(rawPage) ? Number(rawPage) : DEFAULT_LIST_PARAMS.page;
  const rawLimit = Number(searchParams.get('limit'));
  return {
    page: page >= 1 ? page : DEFAULT_LIST_PARAMS.page,
    limit: WEBHOOKS_PAGE_SIZES.find((size) => size === rawLimit) ?? DEFAULT_LIST_PARAMS.limit,
    search: searchParams.get('search')?.trim() ?? DEFAULT_LIST_PARAMS.search,
  };
}

export function serializeListParams({ page, limit, search }: WebhookListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (search !== DEFAULT_LIST_PARAMS.search) params.set('search', search);
  if (limit !== DEFAULT_LIST_PARAMS.limit) params.set('limit', String(limit));
  if (page !== DEFAULT_LIST_PARAMS.page) params.set('page', String(page));
  return params;
}
