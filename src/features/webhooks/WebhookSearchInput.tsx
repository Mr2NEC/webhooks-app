import { CloseButton, TextInput } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { useState } from 'react';
import { SearchIcon } from '@/shared/ui/icons';

const SEARCH_DEBOUNCE_MS = 300;

interface WebhookSearchInputProps {
  value: string;
  onCommit: (search: string) => void;
}

export function WebhookSearchInput({ value, onCommit }: WebhookSearchInputProps) {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const commit = useDebouncedCallback(onCommit, SEARCH_DEBOUNCE_MS);

  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== draft.trim()) setDraft(value);
  }

  const clear = () => {
    commit.cancel();
    setDraft('');
    onCommit('');
  };

  return (
    <TextInput
      aria-label="Пошук за назвою"
      placeholder="Пошук за назвою"
      value={draft}
      onChange={(event) => {
        setDraft(event.currentTarget.value);
        commit(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') commit.flush();
      }}
      leftSection={<SearchIcon />}
      rightSection={draft ? <CloseButton aria-label="Очистити пошук" onClick={clear} /> : null}
      w={{ base: '100%', sm: 320 }}
    />
  );
}
