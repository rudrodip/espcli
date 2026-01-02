import type { EspTarget } from '@/core/types';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Supported ESP32 target chips
 * @see https://github.com/espressif/esptool/blob/master/esptool/targets/__init__.py
 */
export const ESP_TARGETS: EspTarget[] = [
  // Xtensa-based chips
  { id: 'esp32', name: 'ESP32', description: 'Original dual-core Xtensa', stable: true },
  { id: 'esp32s2', name: 'ESP32-S2', description: 'Single-core Xtensa with USB OTG', stable: true },
  { id: 'esp32s3', name: 'ESP32-S3', description: 'Dual-core Xtensa with AI acceleration', stable: true },
  { id: 'esp32s31', name: 'ESP32-S3 (rev1)', description: 'ESP32-S3 revision 1', stable: false },

  // RISC-V based chips
  { id: 'esp32c2', name: 'ESP32-C2', description: 'Single-core RISC-V (cost-optimized)', stable: true },
  { id: 'esp32c3', name: 'ESP32-C3', description: 'Single-core RISC-V', stable: true },
  { id: 'esp32c5', name: 'ESP32-C5', description: 'RISC-V with WiFi 6', stable: false },
  { id: 'esp32c6', name: 'ESP32-C6', description: 'RISC-V with WiFi 6 & 802.15.4', stable: true },
  { id: 'esp32c61', name: 'ESP32-C61', description: 'ESP32-C6 variant', stable: false },

  // 802.15.4/Thread/Zigbee chips
  { id: 'esp32h2', name: 'ESP32-H2', description: 'RISC-V with 802.15.4/Zigbee/Thread', stable: true },
  { id: 'esp32h21', name: 'ESP32-H21', description: 'ESP32-H2 variant', stable: false },
  { id: 'esp32h4', name: 'ESP32-H4', description: 'RISC-V 802.15.4', stable: false },

  // High-performance chips
  { id: 'esp32p4', name: 'ESP32-P4', description: 'High-performance dual-core RISC-V', stable: false },
];

export const DEFAULT_IDF_PATH = join(homedir(), 'esp', 'esp-idf');
export const DEFAULT_ESP_PATH = join(homedir(), 'esp');
export const IDF_REPO_URL = 'https://github.com/espressif/esp-idf.git';

export const DEFAULT_FLASH_BAUD = 460800;
export const DEFAULT_MONITOR_BAUD = 115200;

/**
 * USB Vendor/Product IDs for ESP32 development boards
 *
 * USB-IF Vendor IDs:
 * - 0x303A = Espressif Systems (registered USB vendor): https://github.com/espressif/usb-pids
 * - 0x10C4 = Silicon Labs (CP210x USB-UART bridges)
 * - 0x1A86 = QinHeng Electronics (CH340/CH343 USB-UART bridges)
 * - 0x0403 = FTDI (FT232 USB-UART bridges)
 *
 * References:
 * - USB ID Database: http://www.linux-usb.org/usb.ids
 * - Espressif USB PIDs: https://github.com/espressif/esptool/blob/master/esptool/loader.py
 *   (search for USB_JTAG_SERIAL_PID = 0x1001)
 *
 * Important: Espressif PIDs identify USB MODE, not specific chip variant:
 * - 0x1001 = USB-JTAG/Serial mode (used by ESP32-S2, S3, C3, C6, H2 with built-in USB)
 * - 0x1002 = USB-OTG mode (ESP32-S2, S3)
 * To identify the actual chip, use esptool.py chip_id command.
 */
export const USB_VENDORS: Record<string, { name: string; chips: Record<string, string> }> = {
  // Silicon Labs CP210x - common on older ESP32 dev boards
  // @see https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
  '10C4': {
    name: 'Silicon Labs',
    chips: {
      'EA60': 'CP210x',
      'EA70': 'CP2105',
    },
  },
  // WCH (QinHeng) CH340/CH343 - common on budget ESP32 boards
  // @see https://www.wch-ic.com/products/CH343.html
  '1A86': {
    name: 'QinHeng Electronics',
    chips: {
      '7523': 'CH340',
      '5523': 'CH341',
      '55D3': 'CH343', // High-speed USB-UART, common on newer boards
      '55D4': 'CH9102',
    },
  },
  // FTDI - professional-grade USB-UART bridges
  // @see https://ftdichip.com/products/ft232r/
  '0403': {
    name: 'FTDI',
    chips: {
      '6001': 'FT232R',
      '6010': 'FT2232',
      '6011': 'FT4232',
      '6014': 'FT232H',
    },
  },
  // Espressif native USB - built into ESP32-S2/S3/C3/C6/H2
  // @see https://github.com/espressif/esptool/blob/master/esptool/loader.py#L77
  '303A': {
    name: 'Espressif',
    chips: {
      '1001': 'ESP32 (USB-JTAG)', // USB_JTAG_SERIAL_PID
      '1002': 'ESP32 (USB-OTG)', // USB_OTG_PID
    },
  },
};

export const SHELL_CONFIGS: Record<string, string> = {
  zsh: '.zshrc',
  bash: '.bashrc',
  fish: '.config/fish/config.fish',
};

export const VERSION = '0.0.1';
