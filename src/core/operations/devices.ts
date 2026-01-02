import type { SerialDevice } from '@/core/types';
import { ResultAsync } from 'neverthrow';
import type { AppError } from '@/core/errors';
import { listPorts } from '@/core/services/ports';

export function listDevices(): ResultAsync<SerialDevice[], AppError> {
  return listPorts();
}
