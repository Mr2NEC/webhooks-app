import {
  Alert,
  Box,
  Button,
  Divider,
  Group,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { isSessionExpiredError } from '@/shared/api/errors';
import { WEBHOOKS_PAGE_SIZES } from '@/shared/config';
import { SearchIcon } from '@/shared/ui/icons';
import { useWebhookList } from './queries';
import { useListParams } from './use-list-params';
import { WebhookSearchInput } from './WebhookSearchInput';
import { WebhooksTable, WebhooksTableSkeleton } from './WebhooksTable';

const PAGE_SIZE_OPTIONS = WEBHOOKS_PAGE_SIZES.map(String);
const MIN_TABLE_HEIGHT = 240;

export function WebhooksListPage() {
  const { params, setPage, setLimit, setSearch } = useListParams();
  const { data, error, isPending, isError, isFetching, isPlaceholderData, refetch } = useWebhookList(params);

  const lastPage = isPlaceholderData ? undefined : data?.paging.pages.last;
  useEffect(() => {
    if (lastPage !== undefined && lastPage >= 1 && params.page > lastPage)
      setPage(lastPage, { replace: true });
  }, [lastPage, params.page, setPage]);

  const showError = isError && !isSessionExpiredError(error);

  const renderBody = () => {
    if (isPending) return <WebhooksTableSkeleton rows={params.limit} />;
    if (!data) {
      return showError ? (
        <Alert color="red" title="Не вдалося завантажити вебхуки" m="md">
          <Button size="xs" variant="light" onClick={() => void refetch()}>
            Спробувати ще раз
          </Button>
        </Alert>
      ) : null;
    }
    if (data.data.length === 0) {
      return (
        <Stack align="center" py={56} px="md" gap="xs">
          <ThemeIcon variant="default" size={48} radius="xl">
            <SearchIcon size={22} />
          </ThemeIcon>
          <Text fw={600} ta="center">
            {params.search ? `Нічого не знайдено за запитом «${params.search}»` : 'Вебхуків поки немає'}
          </Text>
          {params.search && (
            <Button
              variant="default"
              mt="xs"
              onClick={() => {
                setSearch('');
              }}
            >
              Скинути пошук
            </Button>
          )}
        </Stack>
      );
    }
    return (
      <>
        {showError && (
          <Alert color="red" m="md">
            Не вдалося оновити дані — показано останні завантажені.
          </Alert>
        )}
        <Box style={{ opacity: isFetching && isPlaceholderData ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <WebhooksTable webhooks={data.data} />
        </Box>
      </>
    );
  };

  const renderFooter = () => {
    if (!data || data.data.length === 0) return null;

    const { total, limitation } = data.paging.results;
    const firstShown = (data.paging.pages.current - 1) * limitation + 1;
    return (
      <>
        <Divider />
        <Group justify="space-between" px="lg" py="sm">
          <Group gap="lg">
            <Group gap="xs">
              <Text size="sm" c="dimmed" aria-hidden>
                Рядків на сторінці
              </Text>
              <Select
                aria-label="Рядків на сторінці"
                size="xs"
                w={72}
                allowDeselect={false}
                data={PAGE_SIZE_OPTIONS}
                value={String(params.limit)}
                onChange={(value) => {
                  if (value !== null) setLimit(Number(value));
                }}
              />
            </Group>
            <Text size="sm" c="dimmed">
              Показано {firstShown}–{firstShown + data.data.length - 1} з {total}
            </Text>
          </Group>
          <Pagination
            size="sm"
            total={data.paging.pages.last}
            value={params.page}
            onChange={(page) => {
              setPage(page);
            }}
          />
        </Group>
      </>
    );
  };

  return (
    <Stack h="100%">
      <Title order={2}>Вебхуки</Title>
      <Paper
        withBorder
        flex={1}
        mih={0}
        display="flex"
        style={{ flexDirection: 'column', overflow: 'hidden' }}
      >
        <Box p="md">
          <WebhookSearchInput value={params.search} onCommit={setSearch} />
        </Box>
        <Divider />
        <ScrollArea flex={1} mih={MIN_TABLE_HEIGHT}>
          {renderBody()}
        </ScrollArea>
        {renderFooter()}
      </Paper>
      <Outlet />
    </Stack>
  );
}
