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

  function showFiles(pickedPath: string) {
    vscode.window.showQuickPick(listDir(pickedPath)).then(item => {
      if (!item) {
        console.log("canceled pick");
        return;
      }
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

  context.subscriptions.push(vscode.commands.registerCommand(CMD_QUICKOPEN, async (pickedPath: string) => {
    if (typeof pickedPath !== "string") {
      console.log("pickedPath is not a string");
      console.log(pickedPath);
      pickedPath = "";
    }
    try {
      pickedPath = pickedPath || getRootPath();
      console.log("quickOpen", pickedPath);
      pickedPath = fixFilePath(pickedPath);
      const s = await readFileStats(pickedPath);
      if (s.isFile()) {
        openDocument(pickedPath);
        return;
      }
      if (s.isDirectory()) {
        showFiles(pickedPath);
        return;
      }
    } catch (err) {
      vscode.window.showErrorMessage(err && err.message || String(err));
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand(CMD_QUICKOPEN_PATH, async (inputPath: string) => {
    if (typeof inputPath !== "string") {
      console.log("inputPath is not a string");
      console.log(inputPath);
      inputPath = "";
    }
    if (!inputPath) {
      inputPath = await vscode.window.showInputBox({
        prompt: "Enter the file path to open",
      });
    }
    vscode.commands.executeCommand(CMD_QUICKOPEN, inputPath);
  }));
}

export function deactivate() { }

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
