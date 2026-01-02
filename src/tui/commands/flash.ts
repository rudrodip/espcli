import { flash } from '@/core/operations/flash';
import { listDevices } from '@/core/operations/devices';
import { findProjectRoot } from '@/core/services/idf';
import { loadConfig, updateConfig, configExists } from '@/core/services/config';
import { DEFAULT_FLASH_BAUD } from '@/core/constants';
import { emitter, createOperationId } from '@/core/emitter';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface FlashOptions {
  port?: string;
  baud?: number;
}

export async function flashCommand(options: FlashOptions): Promise<void> {
  const projectResult = await findProjectRoot(process.cwd());

  if (projectResult.isErr()) {
    logger.error('Not in an ESP-IDF project directory');
    process.exit(1);
  }

  const projectDir = projectResult.value;
  const configResult = await loadConfig(projectDir);
  const config = configResult.isOk() ? configResult.value : {};

  const devicesResult = await listDevices();

  if (devicesResult.isErr()) {
    logger.error(devicesResult.error.message);
    process.exit(1);
  }

  const devices = devicesResult.value;
  let port = options.port || config.port;
  let selectedDevice = port ? prompts.getDeviceByPort(devices, port) : undefined;

  if (!port || !selectedDevice) {
    port = await prompts.selectDevice(devices);
    selectedDevice = prompts.getDeviceByPort(devices, port);
  }

  if (selectedDevice) {
    const portCheck = prompts.checkPortForFlash(selectedDevice);
    if (!portCheck.ok && portCheck.warning) {
      logger.warn(portCheck.warning);
      const useAnyway = await prompts.confirm('Continue with this port?', false);
      if (!useAnyway) {
        port = await prompts.selectDevice(devices);
        selectedDevice = prompts.getDeviceByPort(devices, port);
      }
    }
  }

  let baud = options.baud || config.flashBaud || DEFAULT_FLASH_BAUD;

  if (!options.baud && !config.flashBaud) {
    baud = await prompts.confirmBaudRate('flash', baud);
  }

  if (port !== config.port || baud !== config.flashBaud) {
    const hasConfigResult = await configExists(projectDir);
    const hasConfig = hasConfigResult.isOk() && hasConfigResult.value;
    if (hasConfig) {
      await updateConfig(projectDir, { port, flashBaud: baud });
    } else {
      const saveSettings = await prompts.confirm('Save port and baud rate to project config?', true);
      if (saveSettings) {
        await updateConfig(projectDir, { port, flashBaud: baud });
        logger.dim('Settings saved to .espcli');
      }
    }
  }

  const opId = createOperationId();

  emitter.subscribe(opId, (event) => {
    if (event.data.type === 'stdout' || event.data.type === 'stderr') {
      logger.output(event.data.text);
    }
  });

  logger.step(`Flashing to ${port} at ${baud} baud...`);

  const result = await flash({ projectDir, port, baud }, opId);

  if (result.isErr()) {
    logger.newline();
    logger.error(result.error.message);
    process.exit(1);
  }

  logger.newline();
  logger.success('Flash complete');
}
