# espcli

A modern CLI for ESP-IDF development. Simplifies project creation, building, flashing, and monitoring for ESP32 microcontrollers.

> **Note:** Currently supports macOS and Linux only.

## Features

- 🚀 **One-command setup** — Install ESP-IDF with automatic shell configuration
- 📁 **Project scaffolding** — Generate C or C++ projects with proper structure
- 🔌 **Device detection** — Auto-detect connected ESP boards via USB
- 🔨 **Build integration** — Compile projects with target selection
- ⚡ **Flash firmware** — Program devices with configurable baud rates
- 📡 **Serial monitor** — Real-time UART output with color support
- 🔄 **Run workflow** — Build, flash, and monitor in a single command
- 🩺 **Health checks** — Diagnose ESP-IDF installation issues

## Supported Chips

| Xtensa | RISC-V | 802.15.4/Thread |
|--------|--------|-----------------|
| ESP32 | ESP32-C2 | ESP32-H2 |
| ESP32-S2 | ESP32-C3 | |
| ESP32-S3 | ESP32-C6 | |
| | ESP32-P4 | |

## Installation

### Prerequisites

- Git
- Python 3.8+

### Install globally

```bash
npm install -g espcli
```

### Or run directly with npx/bunx

```bash
npx espcli <command>
# or
bunx espcli <command>
```

## Quick Start

### 1. Install ESP-IDF

```bash
espcli install
```

This downloads ESP-IDF, installs toolchains, and configures your shell.

### 2. Create a Project

```bash
espcli init my-project
```

Interactive prompts let you choose language (C/C++) and target chip.

### 3. Build, Flash & Monitor

```bash
cd my-project
espcli run
```

Or run each step separately:

```bash
espcli build
espcli flash
espcli monitor
```

## Commands

| Command | Description |
|---------|-------------|
| `install` | Install ESP-IDF framework |
| `init [name]` | Create a new ESP-IDF project |
| `devices` | List connected ESP devices |
| `build` | Build the current project |
| `flash` | Flash firmware to device |
| `monitor` | Open serial monitor |
| `run` | Build, flash, and monitor |
| `clean` | Clean build artifacts |
| `doctor` | Check system health |

### Command Options

```bash
# Install with custom path and target
espcli install --path ~/esp --target esp32s3

# Initialize with language and target
espcli init my-project --lang cpp --target esp32c3

# Build with target change and clean
espcli build --target esp32s3 --clean

# Flash with specific port and baud rate
espcli flash --port /dev/ttyUSB0 --baud 921600

# Monitor with specific port
espcli monitor --port /dev/ttyUSB0 --baud 115200

# Run with options
espcli run --port /dev/ttyUSB0 --skip-build

# Full clean including sdkconfig
espcli clean --full
```

## Project Structure

Generated projects follow ESP-IDF conventions:

```
my-project/
├── CMakeLists.txt
├── main/
│   ├── CMakeLists.txt
│   └── main.c (or main.cpp)
└── sdkconfig
```

## Troubleshooting

### ESP-IDF not found

Run `espcli doctor` to check your installation, then:

```bash
espcli install
```

### Device not detected

1. Check USB connection
2. Run `espcli devices` to list ports
3. Ensure you have permission to access serial ports:
   ```bash
   # Linux
   sudo usermod -aG dialout $USER
   ```

### Build fails

```bash
espcli clean --full
espcli build
```

## Contributing

```bash
git clone https://github.com/rudrodip/espcli.git
cd espcli
bun install

# Run in development
bun run dev

# Type check
bun run typecheck

# Build for distribution
bun run build
```

## License

[MIT](LICENSE)

## Author

[rds_agi](https://github.com/rudrodip)
