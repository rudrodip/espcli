import { listDevices } from '@/core/operations/devices';
import { deviceTable } from '@/tui/display';
import { logger } from '@/tui/logger';

export async function devicesCommand(): Promise<void> {
  logger.info('Scanning for devices...');

  const result = await listDevices();

  if (result.isErr()) {
    logger.error(result.error.message);
    process.exit(1);
  }

  logger.newline();
  deviceTable(result.value);
  logger.newline();
}
