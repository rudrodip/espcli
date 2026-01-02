import { build } from '@/core/operations/build';
import { flash } from '@/core/operations/flash';
import { startMonitor } from '@/core/operations/monitor';
import { listDevices } from '@/core/operations/devices';
import { findProjectRoot } from '@/core/services/idf';
import { emitter, createOperationId } from '@/core/emitter';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface RunOptions {
  port?: string;
  baud?: number;
  skipBuild?: boolean;
}

export async function runCommand(options: RunOptions): Promise<void> {
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

  const streamHandler = (event: { data: { type: string; text?: string } }) => {
    if (event.data.type === 'stdout' || event.data.type === 'stderr') {
      logger.output((event.data as { text: string }).text);
    }
  };

  if (!options.skipBuild) {
    const buildOpId = createOperationId();
    emitter.subscribe(buildOpId, streamHandler);

    logger.step('Building...');

    const buildResult = await build({ projectDir }, buildOpId);

    if (!buildResult.ok) {
      logger.newline();
      logger.error(buildResult.error);
      process.exit(1);
    }

    logger.newline();
    logger.success('Build complete');
  }

  const flashOpId = createOperationId();
  emitter.subscribe(flashOpId, streamHandler);

  logger.step(`Flashing to ${port}...`);

  const flashResult = await flash({ projectDir, port, baud: options.baud }, flashOpId);

  if (!flashResult.ok) {
    logger.newline();
    logger.error(flashResult.error);
    process.exit(1);
  }

  logger.newline();
  logger.success('Flash complete');

  const monitorOpId = createOperationId();
  emitter.subscribe(monitorOpId, streamHandler);

  logger.step('Starting monitor...');
  logger.dim('Press Ctrl+C to exit');
  logger.newline();

  const monitorResult = startMonitor({ port, baud: options.baud, projectDir }, monitorOpId);

  if (!monitorResult.ok) {
    logger.error(monitorResult.error);
    process.exit(1);
  }

  process.on('SIGINT', () => {
    monitorResult.data.stop();
    logger.newline();
    logger.info('Monitor stopped');
    process.exit(0);
  });

  await new Promise(() => {});
}
