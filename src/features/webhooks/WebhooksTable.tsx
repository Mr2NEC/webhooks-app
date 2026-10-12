import { Anchor, Skeleton, Table, Text } from '@mantine/core';
import { Link, useLocation } from 'react-router';
import { WebhookStatusBadge } from './WebhookStatusBadge';
import type { Webhook } from './types';

const ROW_HEIGHT = 52;
const MIN_WIDTH = 600;

function TableHead() {
  return (
    <Table.Thead>
      <Table.Tr>
        <Table.Th w="34%">Назва</Table.Th>
        <Table.Th>URL</Table.Th>
        <Table.Th w={150}>Активність</Table.Th>
      </Table.Tr>
    </Table.Thead>
  );
}

export function WebhooksTable({ webhooks }: { webhooks: Webhook[] }) {
  const { search } = useLocation();

  return (
    <Table highlightOnHover stickyHeader layout="fixed" miw={MIN_WIDTH}>
      <TableHead />
      <Table.Tbody>
        {webhooks.map((webhook) => (
          <Table.Tr key={webhook.id} h={ROW_HEIGHT}>
            <Table.Td>
              <Text truncate title={webhook.name}>
                <Anchor
                  component={Link}
                  to={{ pathname: `/webhooks/${webhook.id}`, search }}
                  inherit
                  fw={500}
                >
                  {webhook.name}
                </Anchor>
              </Text>
            </Table.Td>
            <Table.Td>
              <Text size="sm" ff="monospace" c="dimmed" truncate title={webhook.url}>
                {webhook.url}
              </Text>
            </Table.Td>
            <Table.Td>
              <WebhookStatusBadge active={webhook.active} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function WebhooksTableSkeleton({ rows }: { rows: number }) {
  return (
    <Table aria-busy stickyHeader layout="fixed" miw={MIN_WIDTH}>
      <TableHead />
      <Table.Tbody>
        {Array.from({ length: rows }, (_, index) => (
          <Table.Tr key={index} h={ROW_HEIGHT}>
            <Table.Td>
              <Skeleton h={16} w="60%" />
            </Table.Td>
            <Table.Td>
              <Skeleton h={16} w="80%" />
            </Table.Td>
            <Table.Td>
              <Skeleton h={20} w={96} radius="xl" />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
