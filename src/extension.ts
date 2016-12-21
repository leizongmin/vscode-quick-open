/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Zongmin Lei <leizongmin@gmail.com> All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";
import * as leiDownload from "lei-download";

export function activate(context: vscode.ExtensionContext) {

  const CMD_QUICKOPEN = "extension.quickOpen";
  const CMD_QUICKOPEN_PATH = "extension.quickOpenPath";

  const HOME_DIR = os.homedir();

  function getRootPath(): string {
    return vscode.workspace.rootPath || "/";
  }

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  context.subscriptions.push(statusBar);
  let statusBarTid: NodeJS.Timer;

  function showStatusInfo(msg) {
    statusBar.text = msg;
    statusBar.color = "white";
    statusBar.show();
    autoHideStatusBar(2);
  }

  function showStatusWran(msg) {
    statusBar.text = msg;
    statusBar.color = "yellow";
    statusBar.show();
    autoHideStatusBar(10);
  }

  function autoHideStatusBar(s: number) {
    if (statusBarTid) {
      clearTimeout(statusBarTid);
    }
    statusBarTid = setTimeout(() => {
      statusBar.hide();
    }, s * 1000);
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
    if (isURL(inputPath)) {
      showStatusInfo(`Downloading ${ inputPath }`);
      try {
        inputPath = await download(inputPath, (size, total) => {
          console.log("download progress: ", size, total);
          if (total) {
            showStatusInfo(`Downloading ${ (size / total * 100).toFixed(1) }%`);
          } else {
            showStatusInfo(`Downloading ${ (size / 1024).toFixed(0) }KB`);
          }
        });
      } catch (err) {
        showStatusWran(err.message);
      }
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

/**
 * download remote file and returns local temp path
 */
function download(url: string, onProgress: (size: number, total: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    leiDownload(url, getTempNameFromURL(url), onProgress, (err, fileName) => {
      if (err) {
        reject(err);
      } else {
        resolve(fileName);
      }
    });
  });
}

/**
 * returns temp file name from input URL
 */
function getTempNameFromURL(url: string): string {
  const ext = path.extname(url);
  const fileName = path.resolve(os.tmpdir(), randomString(20) + ext);
  return fileName;
}

/**
 * returns random string
 */
function randomString(size: number): string {
  size = size || 6;
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const max = chars.length + 1;
  let str = "";
  while (size > 0) {
    str += chars.charAt(Math.floor(Math.random() * max));
    size -= 1;
  }
  return str;
}

/**
 * returns true if the input string is an URL
 */
function isURL(url: string): boolean {
  return url.slice(0, 7) === "http://" || url.slice(0, 8) === "https://";
}
