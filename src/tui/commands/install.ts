import { install } from '@/core/operations/install';
import { getIdfStatus } from '@/core/services/idf';
import { getShellInfo } from '@/core/services/shell';
import { emitter, createOperationId } from '@/core/emitter';
import { DEFAULT_ESP_PATH } from '@/core/constants';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface InstallOptions {
  path?: string;
  target?: string;
  yes?: boolean;
}

export async function installCommand(options: InstallOptions): Promise<void> {
  prompts.intro('ESP-IDF Installation');

  const statusResult = await getIdfStatus();
  // getIdfStatus never fails (ResultAsync<IdfStatus, never>)
  const status = statusResult._unsafeUnwrap();

  if (status.installed) {
    logger.info(`ESP-IDF already installed at ${status.path}`);
    if (status.version) {
      logger.info(`Version: ${status.version}`);
    }

    const reinstall = await prompts.confirm('Reinstall ESP-IDF?', false);
    if (!reinstall) {
      prompts.outro('Installation skipped');
      return;
    }
  }

  const path = options.path || DEFAULT_ESP_PATH;
  const target = options.target || 'all';
  const shellInfo = getShellInfo();

  if (!options.yes) {
    prompts.note(
      `Install path: ${path}\nTarget: ${target}\nShell: ${shellInfo.type}\nConfig: ${shellInfo.configPath}`,
      'Installation Plan'
    );

    const proceed = await prompts.confirm('Proceed with installation?');
    if (!proceed) {
      prompts.cancel('Installation cancelled');
      return;
    }
  }

  const opId = createOperationId();
  const spin = prompts.spinner();

  emitter.subscribe(opId, (event) => {
    if (event.data.type === 'progress') {
      spin.message(event.data.message);
    } else if (event.data.type === 'stdout' || event.data.type === 'stderr') {
      spin.stop();
      logger.output(event.data.text);
      spin.start();
    }
  });

  spin.start('Installing ESP-IDF...');

  const result = await install(
    {
      path,
      target,
      addToShell: true,
    },
    opId
  );

  spin.stop();

  if (result.isErr()) {
    logger.error(result.error.message);
    process.exit(1);
  }

  const data = result.value;
  logger.success(`ESP-IDF installed at ${data.idfPath}`);

  if (data.addedToShell) {
    logger.info(`Added to ${shellInfo.configPath}`);
    logger.dim('Restart your shell or run: source ' + shellInfo.configPath);
  }

  prompts.outro('Installation complete');
}
