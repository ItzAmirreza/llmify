import * as vscode from "vscode";
import { createStatusBarItem } from "./statusBar";
import { buildWorkspaceItems, readFileContent } from "./fileSystem";
import { showTreePicker, confirmLargeSelection } from "./ui";
import { generateMarkdown, FileWithContent } from "./markdownFormatter";

export function activate(context: vscode.ExtensionContext) {
  console.log("Llmify extension is now active");

  // Create status bar button
  const statusBarItem = createStatusBarItem();
  context.subscriptions.push(statusBarItem);

  // Register the main command
  const disposable = vscode.commands.registerCommand(
    "llmify.openPicker",
    async () => {
      try {
        // Check if workspace is open
        if (
          !vscode.workspace.workspaceFolders ||
          vscode.workspace.workspaceFolders.length === 0
        ) {
          vscode.window.showErrorMessage(
            "Llmify: Please open a workspace folder first."
          );
          return;
        }

        // Show loading while scanning
        const allItems = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Llmify: Scanning workspace...",
            cancellable: false,
          },
          async () => {
            return await buildWorkspaceItems();
          }
        );

        if (allItems.length === 0) {
          vscode.window.showWarningMessage(
            "Llmify: No files found in workspace."
          );
          return;
        }

        // Show tree picker
        const selectedPaths = await showTreePicker(context, allItems);

        if (!selectedPaths || selectedPaths.length === 0) {
          // User cancelled or selected nothing - exit silently
          return;
        }

        // Confirm large selections
        const confirmed = await confirmLargeSelection(selectedPaths.length);
        if (!confirmed) {
          return;
        }

        // Process selected files
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Llmify",
            cancellable: false,
          },
          async (progress: vscode.Progress<{ message?: string }>) => {
            progress.report({
              message: `Reading ${selectedPaths.length} files...`,
            });

            // Get file items from selected paths
            const fileItems = allItems.filter(
              (item) =>
                item.type === "file" &&
                selectedPaths.includes(item.relativePath)
            );

            // Read file contents
            const filesWithContent: FileWithContent[] = [];
            for (const file of fileItems) {
              try {
                const content = await readFileContent(file.uri);
                filesWithContent.push({
                  relativePath: file.relativePath,
                  content,
                });
              } catch (error) {
                // Skip files that can't be read (e.g., binary files)
                console.warn(
                  `Llmify: Could not read file ${file.relativePath}:`,
                  error
                );
              }
            }

            if (filesWithContent.length === 0) {
              vscode.window.showWarningMessage(
                "Llmify: Could not read any of the selected files."
              );
              return;
            }

            progress.report({ message: "Generating markdown..." });

            // Generate markdown
            const markdown = generateMarkdown(filesWithContent);

            // Copy to clipboard (best-effort)
            try {
              await vscode.env.clipboard.writeText(markdown);
            } catch (err) {
              console.warn("Llmify: Failed to write to clipboard:", err);
            }

            // Also open the markdown in a new editor so it's always accessible
            const doc = await vscode.workspace.openTextDocument({
              content: markdown,
              language: "markdown",
            });
            await vscode.window.showTextDocument(doc, {
              preview: false,
            });

            vscode.window.showInformationMessage(
              `Llmify: Prepared ${filesWithContent.length} file${
                filesWithContent.length === 1 ? "" : "s"
              } as markdown (copied to clipboard and opened in a new tab).`
            );
          }
        );
      } catch (error) {
        console.error("Llmify error:", error);
        vscode.window.showErrorMessage(`Llmify: An error occurred - ${error}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
