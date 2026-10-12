import { Alert, Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useLocation, useNavigate, useParams } from 'react-router';
import { isNotFoundError, isSessionExpiredError } from '@/shared/api/errors';
import { useWebhook } from './queries';
import { WebhookForm, WebhookFormSkeleton } from './WebhookForm';
import { WebhookStatusBadge } from './WebhookStatusBadge';

function parseWebhookId(raw: string | undefined): number | null {
  return raw !== undefined && /^[1-9]\d*$/.test(raw) ? Number(raw) : null;
}

function NotFound() {
  return <Alert color="yellow" title="Вебхук не знайдено" />;
}

function WebhookEditor({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { data, error, isPending, refetch } = useWebhook(id);

  if (isPending) return <WebhookFormSkeleton />;
  if (isNotFoundError(error)) return <NotFound />;
  if (isSessionExpiredError(error)) return null;
  if (error) {
    return (
      <Alert color="red" title="Не вдалося завантажити вебхук">
        <Button size="xs" variant="light" onClick={() => void refetch()}>
          Спробувати ще раз
        </Button>
      </Alert>
    );
  }
  return (
    <Stack>
      <Group gap="sm">
        <WebhookStatusBadge active={data.active} />
        <Text c="dimmed" size="sm">
          Створено: {new Date(data.created_at).toLocaleString('uk-UA')}
        </Text>
      </Group>
      <WebhookForm key={data.id} webhook={data} onSaved={onSaved} />
    </Stack>
  );
}

export function WebhookEditModal() {
  const id = parseWebhookId(useParams().id);
  const { search } = useLocation();
  const navigate = useNavigate();
  const close = () => void navigate({ pathname: '/webhooks', search });

  return (
    <Modal
      opened
      centered
      size="lg"
      title="Редагування вебхука"
      closeButtonProps={{ 'aria-label': 'Закрити' }}
      onClose={close}
    >
      {id === null ? <NotFound /> : <WebhookEditor id={id} onSaved={close} />}
    </Modal>
  );
}
