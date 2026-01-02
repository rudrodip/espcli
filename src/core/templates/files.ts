export function getRootCMakeLists(projectName: string): string {
  return `cmake_minimum_required(VERSION 3.16)
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(${projectName})
`;
}

export function getMainCMakeLists(mainFile: string): string {
  return `idf_component_register(SRCS "${mainFile}"
                       INCLUDE_DIRS ".")
`;
}

export function getCMain(projectName: string): string {
  return `#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

void app_main(void)
{
    while (1) {
        printf("Hello from ${projectName}!\\n");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
`;
}

export function getCppMain(projectName: string): string {
  return `#include <cstdio>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

extern "C" void app_main(void)
{
    while (true) {
        printf("Hello from ${projectName}!\\n");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
`;
}

export function getGitignore(): string {
  return `build/
sdkconfig
sdkconfig.old
*.pyc
__pycache__/
.DS_Store
`;
}

export function getReadme(projectName: string, target: string): string {
  return `# ${projectName}

ESP-IDF project targeting ${target}.

## Build

\`\`\`bash
idf.py build
\`\`\`

## Flash

\`\`\`bash
idf.py -p PORT flash
\`\`\`

## Monitor

\`\`\`bash
idf.py -p PORT monitor
\`\`\`
`;
}

/**
 * VS Code C/C++ properties for ESP-IDF IntelliSense.
 * 
 * Primary: compileCommands from build/ - works perfectly after first build.
 * Fallback: includePath with common IDF locations for pre-build IntelliSense.
 * 
 * Note: ${env:IDF_PATH} only works if VS Code inherits the environment variable.
 * The ~/esp/esp-idf path covers the default ESP-IDF installation location.
 */
export function getVsCodeCppProperties(): string {
  return `{
  "version": 4,
  "configurations": [
    {
      "name": "ESP-IDF",
      "compileCommands": "\${workspaceFolder}/build/compile_commands.json",
      "includePath": [
        "\${workspaceFolder}/**",
        "\${env:HOME}/esp/esp-idf/components/**",
        "\${env:IDF_PATH}/components/**"
      ],
      "browse": {
        "path": [
          "\${workspaceFolder}",
          "\${env:HOME}/esp/esp-idf/components",
          "\${env:IDF_PATH}/components"
        ],
        "limitSymbolsToIncludedHeaders": false
      },
      "defines": [],
      "intelliSenseMode": "gcc-x64",
      "cStandard": "c17",
      "cppStandard": "c++17"
    }
  ]
}
`;
}
