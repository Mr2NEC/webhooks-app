import { describe, expect, it } from 'vitest';
import { parseListParams, serializeListParams } from './list-params';

describe('list params', () => {
  it.each([
    ['', { page: 1, limit: 10, search: '' }],
    ['?page=3&search=order', { page: 3, limit: 10, search: 'order' }],
    ['?page=0', { page: 1, limit: 10, search: '' }],
    ['?page=-2', { page: 1, limit: 10, search: '' }],
    ['?page=abc', { page: 1, limit: 10, search: '' }],
    ['?page=2.5', { page: 1, limit: 10, search: '' }],
    ['?search=%20%20paid%20', { page: 1, limit: 10, search: 'paid' }],
    ['?limit=25&page=2', { page: 2, limit: 25, search: '' }],
    ['?limit=7', { page: 1, limit: 10, search: '' }],
    ['?limit=abc', { page: 1, limit: 10, search: '' }],
  ])('parses %s', (query, expected) => {
    expect(parseListParams(new URLSearchParams(query))).toEqual(expected);
  });

  it('omits defaults when serializing', () => {
    expect(serializeListParams({ page: 1, limit: 10, search: '' }).toString()).toBe('');
    expect(serializeListParams({ page: 2, limit: 10, search: 'crm' }).toString()).toBe('search=crm&page=2');
    expect(serializeListParams({ page: 2, limit: 50, search: 'crm' }).toString()).toBe(
      'search=crm&limit=50&page=2',
    );
  });
});
