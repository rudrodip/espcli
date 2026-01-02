import { clean } from '@/core/operations/clean';
import { findProjectRoot } from '@/core/services/idf';
import { createOperationId } from '@/core/emitter';
import { logger } from '@/tui/logger';

interface CleanOptions {
  full?: boolean;
}

export async function cleanCommand(options: CleanOptions): Promise<void> {
  const projectDir = await findProjectRoot(process.cwd());

  if (!projectDir) {
    logger.error('Not in an ESP-IDF project directory');
    process.exit(1);
  }

  const opId = createOperationId();

  logger.step(options.full ? 'Running fullclean...' : 'Cleaning build...');

  const result = await clean(
    {
      projectDir,
      full: options.full,
    },
    opId
  );

  if (!result.ok) {
    logger.error(result.error);
    process.exit(1);
  }

  logger.success('Clean complete');
}
