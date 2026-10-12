import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isValidationError } from '../api/errors';

export function applyServerErrors<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  fields: readonly Path<TValues>[],
): boolean {
  if (!isValidationError(error)) return false;

  const entries = Object.entries(error.fieldErrors);
  const unknownFieldMessages: string[] = [];

  for (const [field, messages] of entries) {
    const formField = fields.find((name) => name === field);
    const message = messages.join(' ');
    if (formField) setError(formField, { type: 'server', message }, { shouldFocus: true });
    else unknownFieldMessages.push(message);
  }

  if (entries.length === 0 || unknownFieldMessages.length > 0) {
    setError('root.server', { type: 'server', message: unknownFieldMessages.join(' ') || error.message });
  }
  return true;
}
