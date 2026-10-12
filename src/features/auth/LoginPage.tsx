import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Center, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import * as yup from 'yup';
import { applyServerErrors } from '@/shared/forms/apply-server-errors';
import { useAuth, useSession } from './auth-context';
import type { LoginRedirectState } from './RequireAuth';

const loginSchema = yup.object({
  email: yup.string().trim().required('Вкажіть email').email('Некоректний email'),
  password: yup.string().required('Вкажіть пароль'),
});

type LoginFormValues = yup.InferType<typeof loginSchema>;

const DEFAULT_REDIRECT = '/webhooks';

const PAGE_GLOW =
  'radial-gradient(48rem 24rem at 50% 0%, color-mix(in srgb, var(--mantine-color-iris-6) 30%, transparent), transparent), var(--mantine-color-dark-8)';

export function LoginPage() {
  const auth = useAuth();
  const session = useSession();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (session.status === 'authenticated') {
    const { from } = (location.state ?? {}) as LoginRedirectState;
    return <Navigate to={from ?? DEFAULT_REDIRECT} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await auth.login(values);
    } catch (error) {
      if (!applyServerErrors(error, setError, ['email', 'password'])) {
        setError('root.server', { message: 'Не вдалося увійти. Спробуйте ще раз.' });
      }
    }
  });

  return (
    <Center mih="100vh" p="md" bg={PAGE_GLOW}>
      <Paper withBorder p="xl" w="100%" maw={400}>
        <form onSubmit={(event) => void onSubmit(event)} noValidate>
          <Stack>
            <div>
              <Title order={2}>Вхід</Title>
              <Text c="dimmed" size="sm">
                Увійдіть, щоб керувати вебхуками.
              </Text>
            </div>

            {session.status === 'anonymous' && session.reason === 'expired' && (
              <Alert color="yellow">Сесія завершилась. Увійдіть знову.</Alert>
            )}
            {errors.root?.server && <Alert color="red">{errors.root.server.message}</Alert>}

            <TextInput
              label="Email"
              type="email"
              autoComplete="username"
              error={errors.email?.message}
              {...register('email')}
            />
            <PasswordInput
              label="Пароль"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" fullWidth mt="xs" loading={isSubmitting}>
              Увійти
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
