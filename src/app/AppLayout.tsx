import { AppShell, Avatar, Button, Container, Group, Text } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { Outlet } from 'react-router';
import { useAuth, useCurrentUser } from '@/features/auth/auth-context';

export function AppLayout() {
  const auth = useAuth();
  const user = useCurrentUser();
  const logout = useMutation({ mutationFn: () => auth.logout() });

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group h="100%" justify="flex-end" gap="sm" wrap="nowrap">
            <Avatar name={user.name} size="sm" variant="default" />
            <Text size="sm">{user.name}</Text>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              loading={logout.isPending}
              onClick={() => {
                logout.mutate();
              }}
            >
              Вийти
            </Button>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main bg="dark.8" h="100dvh">
        <Container size="lg" py="md" h="100%">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
