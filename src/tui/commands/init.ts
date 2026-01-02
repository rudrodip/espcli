import { init } from '@/core/operations/init';
import { createOperationId } from '@/core/emitter';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';
import { resolve } from 'path';

interface InitOptions {
  lang?: 'c' | 'cpp';
  target?: string;
}

export async function initCommand(name: string | undefined, options: InitOptions): Promise<void> {
  prompts.intro('Create ESP-IDF Project');

  const projectName = name || (await prompts.text('Project name', 'my-esp-project'));

  const language = options.lang || (await prompts.selectLanguage());
  const target = options.target || (await prompts.selectTarget());

  const config = {
    name: projectName,
    directory: resolve(process.cwd()),
    language,
    target,
  };

  prompts.note(
    `Name: ${config.name}\nLanguage: ${language.toUpperCase()}\nTarget: ${target}\nPath: ${config.directory}/${config.name}`,
    'Project Configuration'
  );

  const proceed = await prompts.confirm('Create project?');
  if (!proceed) {
    prompts.cancel('Cancelled');
    return;
  }

  const spin = prompts.spinner();
  spin.start('Creating project...');

  const opId = createOperationId();
  const result = await init(config, opId);

  spin.stop();

  if (result.isErr()) {
    logger.error(result.error.message);
    process.exit(1);
  }

  const data = result.value;
  logger.success(`Created project at ${data.projectPath}`);
  logger.newline();
  logger.dim('Files created:');
  data.files.forEach((f) => logger.dim(`  ${f}`));
  logger.newline();
  logger.info(`cd ${projectName} && espcli build`);

  prompts.outro('Project ready');
}
