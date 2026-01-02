import { build } from '@/core/operations/build';
import { flash } from '@/core/operations/flash';
import { startMonitor } from '@/core/operations/monitor';
import { listDevices } from '@/core/operations/devices';
import { findProjectRoot } from '@/core/services/idf';
import { loadConfig, updateConfig, configExists } from '@/core/services/config';
import { DEFAULT_FLASH_BAUD, DEFAULT_MONITOR_BAUD } from '@/core/constants';
import { emitter, createOperationId } from '@/core/emitter';
import * as prompts from '@/tui/prompts';
import { logger } from '@/tui/logger';

interface RunOptions {
  port?: string;
  baud?: number;
  skipBuild?: boolean;
}

export async function runCommand(options: RunOptions): Promise<void> {
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
      }
    }
  }

  const flashBaud = options.baud || config.flashBaud || DEFAULT_FLASH_BAUD;
  const monitorBaud = config.monitorBaud || DEFAULT_MONITOR_BAUD;

  if (port !== config.port || flashBaud !== config.flashBaud) {
    const hasConfig = await configExists(projectDir);
    if (hasConfig) {
      await updateConfig(projectDir, { port, flashBaud, monitorBaud });
    } else {
      const saveSettings = await prompts.confirm('Save port and baud rate to project config?', true);
      if (saveSettings) {
        await updateConfig(projectDir, { port, flashBaud, monitorBaud });
        logger.dim('Settings saved to .espcli');
      }
    }
  }

  const streamHandler = (event: { data: { type: string; text?: string } }) => {
    if (event.data.type === 'stdout' || event.data.type === 'stderr') {
      logger.output((event.data as { text: string }).text);
    }
  };

  if (!options.skipBuild) {
    const buildOpId = createOperationId();
    emitter.subscribe(buildOpId, streamHandler);

    logger.step('Building...');

    const buildResult = await build({ projectDir }, buildOpId);

    if (!buildResult.ok) {
      logger.newline();
      logger.error(buildResult.error);
      process.exit(1);
    }

    logger.newline();
    logger.success('Build complete');
  }

  const flashOpId = createOperationId();
  emitter.subscribe(flashOpId, streamHandler);

  logger.step(`Flashing to ${port} at ${flashBaud} baud...`);

  const flashResult = await flash({ projectDir, port, baud: flashBaud }, flashOpId);

  if (!flashResult.ok) {
    logger.newline();
    logger.error(flashResult.error);
    process.exit(1);
  }

  logger.newline();
  logger.success('Flash complete');

  logger.step(`Starting monitor at ${monitorBaud} baud...`);
  logger.dim('Press Ctrl+] to exit');
  logger.newline();

  const monitorResult = await startMonitor({ port, baud: monitorBaud, projectDir });

  if (!monitorResult.ok) {
    logger.error(monitorResult.error);
    process.exit(1);
  }

  await monitorResult.data.wait();

  logger.newline();
  logger.info('Monitor stopped');
}
