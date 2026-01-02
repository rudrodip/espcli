import { startMonitor } from '@/core/operations/monitor';
import { listDevices } from '@/core/operations/devices';
import { findProjectRoot } from '@/core/services/idf';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface MonitorOptions {
  port?: string;
  baud?: number;
}

export async function monitorCommand(options: MonitorOptions): Promise<void> {
  const projectDir = await findProjectRoot(process.cwd());

  if (!projectDir) {
    logger.error('Not an ESP-IDF project directory');
    logger.dim('Run this command from within an ESP-IDF project, or use "espcli init" to create one');
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

  logger.step(`Connecting to ${port}...`);
  logger.dim('Press Ctrl+] to exit');
  logger.newline();

  const result = await startMonitor({
    port,
    baud: options.baud,
    projectDir,
  });

  if (!result.ok) {
    logger.error(result.error);
    process.exit(1);
  }

  await result.data.wait();
  
  logger.newline();
  logger.info('Monitor stopped');
  process.exit(0);
}
