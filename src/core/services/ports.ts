import type { SerialDevice, ConnectionType } from '@/core/types';
import { USB_VENDORS } from '@/core/constants';
import { requireIdf } from '@/core/services/health';
import { execa } from 'execa';

// Espressif's USB Vendor ID (0x303A = 12346 decimal)
// @see https://github.com/espressif/usb-pids
const ESPRESSIF_VID = '303A';

/**
 * List serial ports and detect connected ESP32 chips
 *
 * Uses pyserial's CLI: python -m serial.tools.list_ports -v
 * Output format:
 *   /dev/cu.usbmodem1101
 *       desc: USB JTAG/serial debug unit
 *       hwid: USB VID:PID=303A:1001 SER=C0:4E:30:37:1B:BC LOCATION=1-1
 *
 * @see https://pyserial.readthedocs.io/en/latest/tools.html#module-serial.tools.list_ports
 */
export async function listPorts(): Promise<SerialDevice[]> {
  const idf = await requireIdf();
  if (!idf.ok) return []; // IDF not installed

  const python = idf.python;

  try {
    // pyserial CLI tool - cross-platform serial port enumeration
    // @see https://github.com/pyserial/pyserial/blob/master/serial/tools/list_ports.py
    const { stdout } = await execa(python, ['-m', 'serial.tools.list_ports', '-v'], {
      timeout: 5000,
    });

    const devices: SerialDevice[] = [];
    const lines = stdout.split('\n');

    let currentPort: string | null = null;
    let desc = '';
    let hwid = '';

    for (const line of lines) {
      if (line.startsWith('/dev/')) {
        // Save previous device if exists
        if (currentPort) {
          const device = parseDevice(currentPort, desc, hwid);
          if (device) devices.push(device);
        }
        currentPort = line.trim();
        desc = '';
        hwid = '';
      } else if (line.includes('desc:')) {
        desc = line.split('desc:')[1]?.trim() || '';
      } else if (line.includes('hwid:')) {
        hwid = line.split('hwid:')[1]?.trim() || '';
      }
    }

    // Don't forget last device
    if (currentPort) {
      const device = parseDevice(currentPort, desc, hwid);
      if (device) devices.push(device);
    }

    // Detect ESP chips for all compatible devices
    return await detectEspChips(python, devices);
  } catch {
    return [];
  }
}

/**
 * Parse device info from pyserial output
 */
function parseDevice(port: string, desc: string, hwid: string): SerialDevice | null {
  // Skip non-USB ports (Bluetooth, debug-console, etc.)
  if (hwid === 'n/a' || !hwid.includes('VID:PID=')) {
    return null;
  }

  // Parse VID:PID from hwid like "USB VID:PID=303A:1001 SER=... LOCATION=..."
  const vidPidMatch = hwid.match(/VID:PID=([0-9A-Fa-f]+):([0-9A-Fa-f]+)/);
  const vendorId = vidPidMatch?.[1]?.toUpperCase();
  const productId = vidPidMatch?.[2]?.toUpperCase();

  const connectionType = getConnectionType(vendorId);
  const chip = identifyChip(vendorId, productId);

  return {
    port,
    connectionType,
    vendorId,
    productId,
    manufacturer: USB_VENDORS[vendorId || '']?.name,
    chip,
    description: desc !== 'n/a' ? desc : undefined,
  };
}

function getConnectionType(vendorId?: string): ConnectionType {
  if (!vendorId) return 'unknown';
  return vendorId.toUpperCase() === ESPRESSIF_VID ? 'native-usb' : 'uart-bridge';
}

function identifyChip(vendorId?: string, productId?: string): string | undefined {
  if (!vendorId) return undefined;

  const vendor = USB_VENDORS[vendorId.toUpperCase()];
  if (!vendor) return undefined;

  if (productId) {
    const chip = vendor.chips[productId.toUpperCase()];
    if (chip) return chip;
  }

  return vendor.name;
}

/**
 * @see https://github.com/espressif/esptool#chip-id
 */
async function detectEspChips(python: string, devices: SerialDevice[]): Promise<SerialDevice[]> {
  const results = await Promise.all(
    devices.map(async (device) => {
      // Only detect on ESP-compatible ports
      const isEspCompatible =
        device.connectionType === 'native-usb' ||
        device.chip?.includes('CH34') ||
        device.chip?.includes('CP210') ||
        device.chip?.includes('FT232') ||
        device.chip?.includes('CH9');

      if (isEspCompatible) {
        const espChip = await detectEspChip(python, device.port);
        return { ...device, espChip };
      }

      return device;
    })
  );

  return results;
}

/**
 * @see https://github.com/espressif/esptool/blob/master/esptool/cmds.py (chip_id command)
 * @see https://github.com/espressif/esptool/tree/master/esptool/targets (chip definitions)
 */
async function detectEspChip(python: string, port: string): Promise<string | undefined> {
  try {
    const { stdout, stderr } = await execa(python, ['-m', 'esptool', '--port', port, 'chip_id'], {
      timeout: 10000,
      reject: false,
    });

    const output = stdout + stderr;

    const patterns = [
      /Chip is (ESP32[A-Za-z0-9-]*)/i, // "Chip is ESP32-S3 (revision v0.2)"
      /Detecting chip type[.\s]*(ESP32[A-Za-z0-9-]*)/i, // "Detecting chip type... ESP32-S3"
      /Chip type:\s*(ESP32[A-Za-z0-9-]*)/i, // "Chip type: ESP32-S3"
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) return match[1].toUpperCase();
    }
  } catch {
    // esptool failed (port busy, chip not responding, etc.)
  }

  return undefined;
}
