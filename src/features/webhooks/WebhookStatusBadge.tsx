import { Badge } from '@mantine/core';

export function WebhookStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge color={active ? 'green' : 'gray'} variant="dot">
      {active ? 'Активний' : 'Вимкнений'}
    </Badge>
  );
}
