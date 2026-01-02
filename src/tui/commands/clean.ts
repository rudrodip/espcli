import { clean } from '@/core/operations/clean';
import { findProjectRoot } from '@/core/services/idf';
import { createOperationId } from '@/core/emitter';
import { logger } from '@/tui/logger';

interface CleanOptions {
  full?: boolean;
}

export async function cleanCommand(options: CleanOptions): Promise<void> {
  const projectResult = await findProjectRoot(process.cwd());

  if (projectResult.isErr()) {
    logger.error('Not in an ESP-IDF project directory');
    process.exit(1);
  }

  const projectDir = projectResult.value;
  const opId = createOperationId();

  logger.step(options.full ? 'Running fullclean...' : 'Cleaning build...');

  const result = await clean(
    {
      projectDir,
      full: options.full,
    },
    opId
  );

  if (result.isErr()) {
    logger.error(result.error.message);
    process.exit(1);
  }

  logger.success('Clean complete');
}
