import { flash } from '@/core/operations/flash';
import { listDevices } from '@/core/operations/devices';
import { findProjectRoot } from '@/core/services/idf';
import { emitter, createOperationId } from '@/core/emitter';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface FlashOptions {
  port?: string;
  baud?: number;
}

export async function flashCommand(options: FlashOptions): Promise<void> {
  const projectDir = await findProjectRoot(process.cwd());

  if (!projectDir) {
    logger.error('Not in an ESP-IDF project directory');
    process.exit(1);
  }

  let port = options.port;

  if (!port) {
    const devicesResult = await listDevices();

    if (!devicesResult.ok) {
      logger.error(devicesResult.error);
      process.exit(1);
    }

    port = await prompts.selectDevice(devicesResult.data);
  }

  const opId = createOperationId();

  emitter.subscribe(opId, (event) => {
    if (event.data.type === 'stdout' || event.data.type === 'stderr') {
      logger.output(event.data.text);
    }
  });

  logger.step(`Flashing to ${port}...`);

  const result = await flash(
    {
      projectDir,
      port,
      baud: options.baud,
    },
    opId
  );

  if (!result.ok) {
    logger.newline();
    logger.error(result.error);
    process.exit(1);
  }

  logger.newline();
  logger.success('Flash complete');
}
