import { flash } from '@/core/operations/flash';
import { listDevices } from '@/core/operations/devices';
import { findProjectRoot } from '@/core/services/idf';
import { loadConfig, updateConfig } from '@/core/services/config';
import { DEFAULT_FLASH_BAUD } from '@/core/constants';
import { emitter, createOperationId } from '@/core/emitter';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface FlashOptions {
  port?: string;
  baud?: number;
}

export async function flashCommand(options: FlashOptions): Promise<void> {
  const projectDir = await findProjectRoot(process.cwd());

  if (!projectDir) {
    logger.error('Not in an ESP-IDF project directory');
    process.exit(1);
  }

  const config = await loadConfig(projectDir);
  const devices = await listDevices();

  if (!devices.ok) {
    logger.error(devices.error);
    process.exit(1);
  }

  let port = options.port || config.port;
  let selectedDevice = port ? prompts.getDeviceByPort(devices.data, port) : undefined;

  if (!port || !selectedDevice) {
    port = await prompts.selectDevice(devices.data);
    selectedDevice = prompts.getDeviceByPort(devices.data, port);
  }

  if (selectedDevice) {
    const portCheck = prompts.checkPortForFlash(selectedDevice);
    if (!portCheck.ok && portCheck.warning) {
      logger.warn(portCheck.warning);
      const useAnyway = await prompts.confirm('Continue with this port?', false);
      if (!useAnyway) {
        port = await prompts.selectDevice(devices.data);
        selectedDevice = prompts.getDeviceByPort(devices.data, port);
      }
    }
  }

  let baud = options.baud || config.flashBaud || DEFAULT_FLASH_BAUD;

  if (!options.baud && !config.flashBaud) {
    baud = await prompts.confirmBaudRate('flash', baud);
  }

  if (port !== config.port || baud !== config.flashBaud) {
    const saveSettings = await prompts.confirm('Save port and baud rate to project config?', true);
    if (saveSettings) {
      await updateConfig(projectDir, { port, flashBaud: baud });
      logger.dim('Settings saved to espcli.json');
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

  if (!result.ok) {
    logger.newline();
    logger.error(result.error);
    process.exit(1);
  }

  logger.newline();
  logger.success('Flash complete');
}
