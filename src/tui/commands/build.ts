import { build } from '@/core/operations/build';
import { findProjectRoot } from '@/core/services/idf';
import { emitter, createOperationId } from '@/core/emitter';
import { logger } from '@/tui/logger';

interface BuildOptions {
  target?: string;
  clean?: boolean;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const projectDir = await findProjectRoot(process.cwd());

  if (!projectDir) {
    logger.error('Not in an ESP-IDF project directory');
    process.exit(1);
  }

  const opId = createOperationId();

  emitter.subscribe(opId, (event) => {
    if (event.data.type === 'stdout') {
      logger.output(event.data.text);
    } else if (event.data.type === 'stderr') {
      logger.output(event.data.text);
    }
  });

  logger.step('Building project...');

  const result = await build(
    {
      projectDir,
      target: options.target,
      clean: options.clean,
    },
    opId
  );

  if (!result.ok) {
    logger.newline();
    logger.error(result.error);
    process.exit(1);
  }

  logger.newline();
  logger.success('Build complete');
}
