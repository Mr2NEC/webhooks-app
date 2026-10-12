import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Group, Skeleton, Stack, TextInput } from '@mantine/core';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { applyServerErrors } from '@/shared/forms/apply-server-errors';
import { useUpdateWebhook } from './queries';
import type { Webhook } from './types';

const webhookSchema = yup.object({
  name: yup.string().trim().required('Вкажіть назву'),
  url: yup.string().trim().required('Вкажіть URL'),
});

type WebhookFormValues = yup.InferType<typeof webhookSchema>;

interface WebhookFormProps {
  webhook: Webhook;
  onSaved: () => void;
}

export function WebhookForm({ webhook, onSaved }: WebhookFormProps) {
  const update = useUpdateWebhook(webhook.id);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WebhookFormValues>({
    resolver: yupResolver(webhookSchema),
    defaultValues: { name: webhook.name, url: webhook.url },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values);
    } catch (error) {
      if (!applyServerErrors(error, setError, ['name', 'url'])) {
        setError('root.server', { message: 'Не вдалося зберегти зміни. Спробуйте ще раз.' });
      }
      return;
    }
    onSaved();
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate>
      <Stack>
        {errors.root?.server && <Alert color="red">{errors.root.server.message}</Alert>}

        <TextInput label="Назва" withAsterisk error={errors.name?.message} {...register('name')} />
        <TextInput
          label="URL"
          withAsterisk
          placeholder="https://example.com/hook"
          styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
          error={errors.url?.message}
          {...register('url')}
        />

        <Group justify="flex-end" mt="xs">
          <Button
            variant="default"
            disabled={!isDirty || isSubmitting}
            onClick={() => {
              reset();
            }}
          >
            Скасувати зміни
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Зберегти
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

export function WebhookFormSkeleton() {
  return (
    <Stack aria-busy>
      <Skeleton h={20} w={240} />
      <Skeleton h={58} />
      <Skeleton h={58} />
      <Group justify="flex-end" mt="xs">
        <Skeleton h={36} w={240} />
      </Group>
    </Stack>
  );
}
