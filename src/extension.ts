/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Zongmin Lei <leizongmin@gmail.com> All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {

  const CMD_QUICKOPEN = "extension.quickOpen";
  const CMD_QUICKOPEN_PATH = "extension.quickOpenPath";

  const HOME_DIR = os.homedir();

  function getRootPath(): string {
    return vscode.workspace.rootPath || "/";
  }

  async function listDir(dir: string): Promise<vscode.QuickPickItem[]> {
    const list = await readdir(dir);
    const ret: vscode.QuickPickItem[] = [
      {
        description: "/",
        label: "/",
      },
      {
        description: path.resolve(dir, ".."),
        label: "..",
      },
      {
        description: HOME_DIR,
        label: "~",
      },
    ];
    for (const item of list) {
      const f = path.resolve(dir, item);
      ret.push({
        description: f,
        label: item,
      });
    }
    return ret;
  }

  function showFiles(selectPath: string) {
    vscode.window.showQuickPick(listDir(selectPath)).then(item => {
      vscode.commands.executeCommand(CMD_QUICKOPEN, item.description);
    });
  }

  function fixFilePath(file: string): string {
    if (file.slice(0, 2) === "~/" || file === "~") {
      file = HOME_DIR + file.slice(1);
    }
    return file;
  }

  function openDocument(file: string) {
    file = fixFilePath(file);
    console.log("openTextDocument", file);
    vscode.workspace.openTextDocument(file).then(doc => {
      console.log("openTextDocument success", doc.fileName);
      vscode.window.showTextDocument(doc);
    });
  }

  context.subscriptions.push(vscode.commands.registerCommand(CMD_QUICKOPEN, async (selectPath: string) => {
    try {
      console.log("quickOpen", selectPath);
      selectPath = fixFilePath(selectPath || getRootPath());
      const s = await readFileStats(selectPath);
      if (s.isFile()) {
        openDocument(selectPath);
        return;
      }
      if (s.isDirectory()) {
        showFiles(selectPath);
        return;
      }
    } catch (err) {
      vscode.window.showErrorMessage(err && err.message || String(err));
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand(CMD_QUICKOPEN_PATH, async (inputPath: string) => {
    if (!inputPath) {
      inputPath = await vscode.window.showInputBox({
        prompt: "Enter the file path to open",
      });
    }
    vscode.commands.executeCommand(CMD_QUICKOPEN, inputPath);
  }));
}

export function deactivate() {}

/**
 * returns file stats
 */
function readFileStats(filename: string): Promise<fs.Stats> {
  return new Promise((resolve, reject) => {
    fs.stat(filename, (err, stats) => {
      if (err) {
        return reject(err);
      }
      resolve(stats);
    });
  });
}

/**
 * returns directory files
 */
function readdir(dir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, list) => {
      if (err) {
        return reject(err);
      }
      resolve(list);
    });
  });
}
