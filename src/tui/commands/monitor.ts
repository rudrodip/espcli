import { startMonitor } from '@/core/operations/monitor';
import { listDevices } from '@/core/operations/devices';
import { findProjectRoot } from '@/core/services/idf';
import { emitter, createOperationId } from '@/core/emitter';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface MonitorOptions {
  port?: string;
  baud?: number;
}

export async function monitorCommand(options: MonitorOptions): Promise<void> {
  const projectDir = await findProjectRoot(process.cwd());

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

  logger.step(`Connecting to ${port}...`);
  logger.dim('Press Ctrl+C to exit');
  logger.newline();

  const result = startMonitor(
    {
      port,
      baud: options.baud,
      projectDir: projectDir || undefined,
    },
    opId
  );

  if (!result.ok) {
    logger.error(result.error);
    process.exit(1);
  }

  process.on('SIGINT', () => {
    result.data.stop();
    logger.newline();
    logger.info('Monitor stopped');
    process.exit(0);
  });

  await new Promise(() => {});
}
