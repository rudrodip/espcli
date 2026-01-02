import { findProjectRoot } from '@/core/services/idf';
import { spawnWithIdf } from '@/core/services/process';
import { logger } from '@/tui/logger';

export async function menuconfigCommand(): Promise<void> {
  const projectResult = await findProjectRoot(process.cwd());

  if (projectResult.isErr()) {
    logger.error('Not in an ESP-IDF project directory');
    process.exit(1);
  }

  const projectDir = projectResult.value;

  logger.step('Opening menuconfig...');

  const result = await spawnWithIdf('idf.py', ['menuconfig'], {
    cwd: projectDir,
    interactive: true,
  });

  if (result.isErr()) {
    logger.error('ESP-IDF not found. Run `espcli install` first.');
    process.exit(1);
  }

  await result.value.promise;
}
