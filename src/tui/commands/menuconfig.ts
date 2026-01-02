import { findProjectRoot } from '@/core/services/idf';
import { spawnWithIdf } from '@/core/services/process';
import { logger } from '@/tui/logger';

export async function menuconfigCommand(): Promise<void> {
  const projectDir = await findProjectRoot(process.cwd());

  if (!projectDir) {
    logger.error('Not in an ESP-IDF project directory');
    process.exit(1);
  }

  logger.step('Opening menuconfig...');

  const result = await spawnWithIdf('idf.py', ['menuconfig'], {
    cwd: projectDir,
    interactive: true,
  });

  if (!result) {
    logger.error('ESP-IDF not found. Run `espcli install` first.');
    process.exit(1);
  }

  await result.promise;
}
