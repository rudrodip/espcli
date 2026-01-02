import type { InitConfig, InitResult, Result, TemplateFile } from '@/core/types';
import type { ProjectConfig } from '@/core/services/config';
import { CONFIG_FILENAME } from '@/core/services/config';
import { DEFAULT_FLASH_BAUD, DEFAULT_MONITOR_BAUD } from '@/core/constants';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  getRootCMakeLists,
  getMainCMakeLists,
  getCMain,
  getCppMain,
  getGitignore,
  getReadme,
  getVsCodeCppProperties,
} from '@/core/templates/files';

function getProjectConfig(target: string): string {
  const config: ProjectConfig = {
    target,
    flashBaud: DEFAULT_FLASH_BAUD,
    monitorBaud: DEFAULT_MONITOR_BAUD,
  };
  return JSON.stringify(config, null, 2) + '\n';
}

export function generateProjectFiles(config: InitConfig): TemplateFile[] {
  const { name, language, target } = config;
  const mainFile = language === 'cpp' ? 'main.cpp' : 'main.c';
  const mainContent = language === 'cpp' ? getCppMain(name) : getCMain(name);

  return [
    { path: 'CMakeLists.txt', content: getRootCMakeLists(name) },
    { path: 'main/CMakeLists.txt', content: getMainCMakeLists(mainFile) },
    { path: `main/${mainFile}`, content: mainContent },
    { path: '.gitignore', content: getGitignore() },
    { path: 'README.md', content: getReadme(name, target) },
    { path: '.vscode/c_cpp_properties.json', content: getVsCodeCppProperties() },
    { path: CONFIG_FILENAME, content: getProjectConfig(target) },
  ];
}

export async function createProject(config: InitConfig): Promise<Result<InitResult>> {
  const projectPath = join(config.directory, config.name);
  const files = generateProjectFiles(config);

  try {
    await mkdir(join(projectPath, 'main'), { recursive: true });
    await mkdir(join(projectPath, '.vscode'), { recursive: true });

    const createdFiles: string[] = [];

    for (const file of files) {
      const filePath = join(projectPath, file.path);
      await writeFile(filePath, file.content);
      createdFiles.push(file.path);
    }

    return {
      ok: true,
      data: {
        projectPath,
        files: createdFiles,
      },
    };
  } catch (err) {
    return { ok: false, error: `Failed to create project: ${err}` };
  }
}
