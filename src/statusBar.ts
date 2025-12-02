import * as vscode from "vscode";

/**
 * Creates and returns the Llmify status bar item
 */
export function createStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );

  statusBarItem.text = "$(file-code) Llmify";
  statusBarItem.tooltip = "Export files to markdown for LLM";
  statusBarItem.command = "llmify.openPicker";
  statusBarItem.show();

  return statusBarItem;
}
