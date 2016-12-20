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

  const HOME_DIR = os.homedir();

  function getRootPath(): string {
    return vscode.workspace.rootPath || "/";
  }

  async function listDir(dir: string): Promise<vscode.QuickPickItem[]> {
    const list = await readdir(dir);
    const ret: vscode.QuickPickItem[] = [
      {
        description: "Parent Directory",
        detail: path.resolve(dir, ".."),
        label: "..",
      },
      {
        description: "Root Directory",
        detail: "/",
        label: "/",
      },
      {
        description: "Home Directory",
        detail: HOME_DIR,
        label: "~",
      },
    ];
    for (const item of list) {
      const f = path.resolve(dir, item);
      const s = await readFileStats(f);
      ret.push({
        description: `(${ s.isFile() ? "File" : "Dir" })`,
        detail: f,
        label: item,
      });
    }
    return ret;
  }

  function showFiles(selectPath) {
    vscode.window.showQuickPick(listDir(selectPath)).then(item => {
      vscode.commands.executeCommand(CMD_QUICKOPEN, item.detail);
    });
  }

  let disposable = vscode.commands.registerCommand(CMD_QUICKOPEN, async (selectPath: string) => {
    try {
      console.log("quickOpen", selectPath);
      selectPath = selectPath || getRootPath();
      const s = await readFileStats(selectPath);
      if (s.isFile()) {
        console.log("openTextDocument", selectPath);
        vscode.workspace.openTextDocument(selectPath).then(doc => {
          console.log("openTextDocument success", doc.fileName);
          vscode.window.showTextDocument(doc);
        });
        return;
      }
      if (s.isDirectory()) {
        showFiles(selectPath);
        return;
      }
    } catch (err) {
      vscode.window.showErrorMessage(err && err.message || String(err));
    }
  });
  context.subscriptions.push(disposable);
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
