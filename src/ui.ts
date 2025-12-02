import * as vscode from "vscode";
import * as path from "path";
import { WorkspaceItem } from "./fileSystem";

/**
 * Represents a tree node for the file tree
 */
interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

/**
 * Builds a tree structure from flat workspace items
 */
function buildTree(items: WorkspaceItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  // First pass: create all folder nodes
  const folders = items.filter((i) => i.type === "folder");
  folders.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  for (const folder of folders) {
    const node: TreeNode = {
      name: path.basename(folder.relativePath),
      path: folder.relativePath,
      type: "folder",
      children: [],
    };
    nodeMap.set(folder.relativePath, node);

    const parentPath = path.dirname(folder.relativePath);
    if (parentPath === "." || parentPath === "") {
      root.push(node);
    } else {
      const parent = nodeMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }

  // Second pass: add files to their folders
  const files = items.filter((i) => i.type === "file");
  for (const file of files) {
    const node: TreeNode = {
      name: path.basename(file.relativePath),
      path: file.relativePath,
      type: "file",
    };

    const parentPath = path.dirname(file.relativePath);
    if (parentPath === "." || parentPath === "") {
      root.push(node);
    } else {
      const parent = nodeMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }

  // Sort children: folders first, then files, both alphabetically
  function sortChildren(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) {
        sortChildren(node.children);
      }
    }
  }
  sortChildren(root);

  return root;
}

/**
 * Utility to generate a nonce for the webview CSP
 */
function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Generates the HTML for the webview tree picker
 */
function getWebviewContent(webview: vscode.Webview, tree: TreeNode[]): string {
  function renderNode(node: TreeNode, depth: number = 0): string {
    const indent = depth * 16;
    const isFolder = node.type === "folder";
    const icon = isFolder ? "folder" : "file";
    const expandIcon = isFolder
      ? `<span class="expand-icon" aria-hidden="true">&#9656;</span>`
      : `<span class="expand-icon-placeholder"></span>`;

    let html = `
      <div class="tree-item ${isFolder ? "folder" : "file"}" data-path="${
      node.path
    }" data-type="${node.type}" style="padding-left: ${indent}px;">
        <div class="tree-label">
          <input type="checkbox" class="tree-checkbox" data-path="${node.path}" data-type="${node.type}">
          ${expandIcon}
          <span class="icon ${icon}"></span>
          <span class="name">${node.name}</span>
        </div>
      </div>
    `;

    if (isFolder && node.children && node.children.length > 0) {
      html += `<div class="tree-children" data-parent="${node.path}">`;
      for (const child of node.children) {
        html += renderNode(child, depth + 1);
      }
      html += `</div>`;
    }

    return html;
  }

  let treeHtml = "";
  for (const node of tree) {
    treeHtml += renderNode(node);
  }

  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Llmify - Select Files</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground, #cccccc);
      background: var(--vscode-editor-background, #1e1e1e);
      padding: 0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--vscode-panel-border, #444);
      background: var(--vscode-sideBar-background, #252526);
      flex-shrink: 0;
    }
    
    .header h1 {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--vscode-foreground, #cccccc);
    }
    
    .header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .header-btn {
      padding: 4px 10px;
      font-size: 12px;
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.15s;
    }
    
    .header-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    
    .search-container {
      padding: 12px 20px;
      border-bottom: 1px solid var(--vscode-panel-border, #444);
      flex-shrink: 0;
    }
    
    .search-input {
      width: 100%;
      padding: 8px 12px;
      font-size: 13px;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #cccccc);
      border: 1px solid var(--vscode-input-border, #3c3c3c);
      border-radius: 4px;
      outline: none;
    }
    
    .search-input:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }
    
    .search-input::placeholder {
      color: var(--vscode-input-placeholderForeground, #888);
    }
    
    .tree-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px 12px 8px;
    }
    
    .tree-item {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      margin: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      transition: background 0.1s;
    }
    
    .tree-item:hover {
      background: var(--vscode-list-hoverBackground, #2a2d2e);
    }
    
    .tree-item.selected {
      background: var(--vscode-list-activeSelectionBackground, #094771);
    }
    
    .tree-label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      flex: 1;
    }
    
    .tree-checkbox {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--vscode-checkbox-background, #007acc);
      flex-shrink: 0;
    }
    
    .expand-icon {
      width: 16px;
      font-size: 10px;
      color: var(--vscode-foreground, #cccccc);
      transition: transform 0.15s;
      flex-shrink: 0;
      text-align: center;
    }
    
    .expand-icon-placeholder {
      width: 16px;
      flex-shrink: 0;
    }
    
    .tree-item.folder.expanded > .tree-label > .expand-icon {
      transform: rotate(90deg);
    }
    
    .tree-children {
      display: none;
    }
    
    .tree-item.folder.expanded + .tree-children {
      display: block;
    }
    
    .tree-children.hidden {
      display: none !important;
    }
    
    .icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    
    .icon.folder::before {
      content: "📁";
      font-size: 14px;
    }
    
    .icon.file::before {
      content: "📄";
      font-size: 14px;
    }
    
    .name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .footer {
      padding: 16px 20px;
      border-top: 1px solid var(--vscode-panel-border, #444);
      background: var(--vscode-sideBar-background, #252526);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    
    .selection-info {
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #888);
    }
    
    .footer-actions {
      display: flex;
      gap: 10px;
    }
    
    .btn {
      padding: 8px 16px;
      font-size: 13px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.15s, opacity 0.15s;
    }
    
    .btn-primary {
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, #ffffff);
    }
    
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #0062a3);
    }
    
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #cccccc);
    }
    
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494e);
    }
    
    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Select files to export</h1>
    <div class="header-actions">
      <button class="header-btn" id="selectAll">Select All</button>
      <button class="header-btn" id="deselectAll">Deselect All</button>
      <button class="header-btn" id="expandAll">Expand All</button>
      <button class="header-btn" id="collapseAll">Collapse All</button>
    </div>
  </div>
  
  <div class="search-container">
    <input type="text" class="search-input" id="searchInput" placeholder="Search files and folders...">
  </div>
  
  <div class="tree-container" id="treeContainer">
    ${treeHtml}
  </div>
  
  <div class="footer">
    <span class="selection-info" id="selectionInfo">0 files selected</span>
    <div class="footer-actions">
      <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="exportBtn" disabled>Export to Clipboard</button>
    </div>
  </div>
  
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const treeContainer = document.getElementById('treeContainer');
    const searchInput = document.getElementById('searchInput');
    const selectionInfo = document.getElementById('selectionInfo');
    const exportBtn = document.getElementById('exportBtn');

    const treeItems = Array.from(document.querySelectorAll('.tree-item'));
    const treeContainers = Array.from(
      document.querySelectorAll('.tree-children')
    );
    const checkboxes = Array.from(
      document.querySelectorAll('.tree-checkbox')
    );
    const folderItems = treeItems.filter((item) =>
      item.classList.contains('folder')
    );
    const fileCheckboxes = checkboxes.filter(
      (cb) => cb.dataset.type === 'file'
    );

    const checkboxByPath = new Map();
    const containerByParent = new Map();
    const descendantCache = new Map();

    checkboxes.forEach((cb) => {
      if (cb.dataset.path) {
        checkboxByPath.set(cb.dataset.path, cb);
      }
    });
    treeContainers.forEach((container) => {
      const parentPath = container.dataset.parent;
      if (parentPath) {
        containerByParent.set(parentPath, container);
      }
    });

    const searchIndex = treeItems.map((item) => ({
      element: item,
      pathLower: (item.dataset.path || '').toLowerCase(),
    }));

    function updateSelectionInfo() {
      let fileCount = 0;
      for (const cb of fileCheckboxes) {
        if (cb.checked) {
          fileCount++;
        }
      }
      selectionInfo.textContent =
        fileCount + ' file' + (fileCount === 1 ? '' : 's') + ' selected';
      exportBtn.disabled = fileCount === 0;
    }

    function findChildrenContainer(folderPath) {
      return containerByParent.get(folderPath);
    }

    function getDescendantCheckboxes(folderPath) {
      const cached = descendantCache.get(folderPath);
      if (cached) {
        return cached;
      }

      const result = [];
      const stack = [folderPath];
      while (stack.length > 0) {
        const current = stack.pop();
        const container = findChildrenContainer(current);
        if (!container) {
          continue;
        }
        const childCheckboxes = Array.from(
          container.querySelectorAll('.tree-checkbox')
        );
        result.push(...childCheckboxes);

        for (const cb of childCheckboxes) {
          if (cb.dataset.type === 'folder' && cb.dataset.path) {
            stack.push(cb.dataset.path);
          }
        }
      }

      descendantCache.set(folderPath, result);
      return result;
    }

    function setDescendantsChecked(folderPath, select) {
      const descendantCheckboxes = getDescendantCheckboxes(folderPath);
      descendantCheckboxes.forEach((cb) => {
        cb.checked = select;
        cb.indeterminate = false;
      });
    }

    function findParentPath(checkbox) {
      const container = checkbox.closest('.tree-children');
      return container?.dataset.parent;
    }

    function updateFolderState(folderPath) {
      const folderCheckbox = checkboxByPath.get(folderPath);
      if (!folderCheckbox) {
        return;
      }
      const container = findChildrenContainer(folderPath);
      if (!container) {
        folderCheckbox.indeterminate = false;
        return;
      }
      const childCheckboxes = Array.from(
        container.querySelectorAll('.tree-checkbox')
      );
      if (childCheckboxes.length === 0) {
        folderCheckbox.indeterminate = false;
        return;
      }
      let checkedCount = 0;
      let indeterminateCount = 0;

      for (const cb of childCheckboxes) {
        if (cb.checked) {
          checkedCount++;
        }
        if (cb.indeterminate) {
          indeterminateCount++;
        }
      }

      if (checkedCount === childCheckboxes.length) {
        folderCheckbox.checked = true;
        folderCheckbox.indeterminate = false;
      } else if (checkedCount === 0 && indeterminateCount === 0) {
        folderCheckbox.checked = false;
        folderCheckbox.indeterminate = false;
      } else {
        folderCheckbox.checked = false;
        folderCheckbox.indeterminate = true;
      }
    }

    function updateAncestorStates(startCheckbox) {
      let parentPath = findParentPath(startCheckbox);
      while (parentPath) {
        updateFolderState(parentPath);
        const parentCheckbox = checkboxByPath.get(parentPath);
        if (!parentCheckbox) {
          break;
        }
        parentPath = findParentPath(parentCheckbox);
      }
    }

    function handleCheckboxChange(checkbox) {
      const path = checkbox.dataset.path;
      const type = checkbox.dataset.type;

      if (type === 'folder' && path) {
        setDescendantsChecked(path, checkbox.checked);
      }

      updateAncestorStates(checkbox);
      updateSelectionInfo();
    }

    // Event delegation to avoid accidental selection and reduce listeners
    treeContainer?.addEventListener('click', (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.classList.contains('tree-checkbox')
      ) {
        return;
      }

      const folderItem =
        target instanceof HTMLElement
          ? target.closest('.tree-item.folder')
          : null;

      if (folderItem && treeContainer.contains(folderItem)) {
        folderItem.classList.toggle('expanded');
      }
    });

    treeContainer?.addEventListener('change', (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.classList.contains('tree-checkbox')
      ) {
        handleCheckboxChange(target);
      }
    });

    // Select all
    document.getElementById('selectAll')?.addEventListener('click', () => {
      checkboxes.forEach((cb) => {
        cb.checked = true;
        cb.indeterminate = false;
      });
      folderItems.forEach((item) => {
        const folderPath = item.getAttribute('data-path');
        if (folderPath) {
          updateFolderState(folderPath);
        }
      });
      updateSelectionInfo();
    });

    // Deselect all
    document.getElementById('deselectAll')?.addEventListener('click', () => {
      checkboxes.forEach((cb) => {
        cb.checked = false;
        cb.indeterminate = false;
      });
      folderItems.forEach((item) => {
        const folderPath = item.getAttribute('data-path');
        if (folderPath) {
          updateFolderState(folderPath);
        }
      });
      updateSelectionInfo();
    });

    // Expand all
    document.getElementById('expandAll')?.addEventListener('click', () => {
      folderItems.forEach((item) => item.classList.add('expanded'));
    });

    // Collapse all
    document.getElementById('collapseAll')?.addEventListener('click', () => {
      folderItems.forEach((item) => item.classList.remove('expanded'));
    });

    function debounce(fn, delay) {
      let handle;
      return (...args) => {
        clearTimeout(handle);
        handle = window.setTimeout(() => fn(...args), delay);
      };
    }

    let searchRaf = 0;
    const runSearch = debounce((value) => {
      if (searchRaf) {
        cancelAnimationFrame(searchRaf);
      }
      searchRaf = requestAnimationFrame(() => applySearch(value));
    }, 120);

    function applySearch(rawValue) {
      const query = rawValue.toLowerCase().trim();

      if (!query) {
        treeItems.forEach((item) => item.classList.remove('hidden'));
        treeContainers.forEach((container) =>
          container.classList.remove('hidden')
        );
        return;
      }

      const visibleItems = new Set();
      const visibleContainers = new Set();

      for (const entry of searchIndex) {
        if (entry.pathLower.includes(query)) {
          visibleItems.add(entry.element);

          let parent = entry.element.parentElement;
          while (parent && parent !== treeContainer) {
            if (parent.classList.contains('tree-children')) {
              visibleContainers.add(parent);
              const parentItem = parent.previousElementSibling;
              if (
                parentItem &&
                parentItem.classList.contains('tree-item')
              ) {
                visibleItems.add(parentItem);
                parentItem.classList.add('expanded');
              }
            }
            parent = parent.parentElement;
          }
        }
      }

      treeItems.forEach((item) => {
        item.classList.toggle('hidden', !visibleItems.has(item));
      });
      treeContainers.forEach((container) => {
        container.classList.toggle('hidden', !visibleContainers.has(container));
      });
    }

    // Search functionality (debounced to stay responsive on large trees)
    searchInput?.addEventListener('input', (event) => {
      const value = event.target.value || '';
      runSearch(value);
    });

    // Cancel button
    document.getElementById('cancelBtn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    // Export button
    exportBtn?.addEventListener('click', () => {
      const selected = document.querySelectorAll(
        '.tree-checkbox[data-type="file"]:checked'
      );
      const filePaths = Array.from(selected)
        .map((cb) => cb.getAttribute('data-path'))
        .filter((p) => !!p);
      vscode.postMessage({ type: 'export', paths: filePaths });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        vscode.postMessage({ type: 'cancel' });
      } else if (event.key === 'Enter' && !exportBtn.disabled) {
        exportBtn.click();
      }
    });

    // Initialize selection info
    updateSelectionInfo();
  </script>
</body>
</html>`;
}

/**
 * Shows the tree picker webview and returns selected file paths
 */
export function showTreePicker(
  context: vscode.ExtensionContext,
  items: WorkspaceItem[]
): Promise<string[] | undefined> {
  return new Promise((resolve) => {
    const tree = buildTree(items);

    const panel = vscode.window.createWebviewPanel(
      "llmifyPicker",
      "Llmify - Select Files",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent(panel.webview, tree);

    let resolved = false;
    const resolveOnce = (paths?: string[]) => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve(paths);
    };

    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case "cancel":
            resolveOnce(undefined);
            panel.dispose();
            break;
          case "export": {
            const paths = Array.isArray(message.paths)
              ? (message.paths as unknown[]).filter(
                  (p: unknown): p is string =>
                    typeof p === "string" && p.length > 0
                )
              : [];
            resolveOnce(paths);
            panel.dispose();
            break;
          }
        }
      },
      undefined,
      context.subscriptions
    );

    panel.onDidDispose(() => {
      resolveOnce(undefined);
    });
  });
}

/**
 * Shows a warning for large selections and asks for confirmation
 */
export async function confirmLargeSelection(
  fileCount: number
): Promise<boolean> {
  if (fileCount <= 50) {
    return true;
  }

  const result = await vscode.window.showWarningMessage(
    `You are about to export ${fileCount} files. This may result in a very large output. Continue?`,
    { modal: true },
    "Yes",
    "No"
  );

  return result === "Yes";
}
