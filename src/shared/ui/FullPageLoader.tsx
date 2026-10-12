import { Center, Loader } from '@mantine/core';

export function FullPageLoader() {
  return (
    <Center h="100vh" bg="dark.8">
      <Loader aria-label="Завантаження" />
    </Center>
  );
}
