import { findIdfPath } from '@/core/services/idf';
import { getExportCommand } from '@/core/services/shell';
import { logger } from '@/tui/logger';
import pc from 'picocolors';

export async function sourceCommand(): Promise<void> {
  const result = await findIdfPath();

  if (result.isErr()) {
    logger.error('ESP-IDF not found. Run `espcli install` first.');
    process.exit(1);
  }

  const idfPath = result.value;
  const exportCmd = getExportCommand(idfPath);

  logger.newline();
  logger.info('To add idf.py to your current terminal session, run:');
  logger.newline();
  console.log(`  ${pc.cyan(exportCmd)}`);
  logger.newline();
  logger.dim('Or copy and paste this command:');
  console.log(exportCmd);
  logger.newline();
}
