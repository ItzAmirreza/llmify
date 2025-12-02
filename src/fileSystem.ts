import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Default glob patterns to exclude from file discovery
 */
const DEFAULT_EXCLUDE_PATTERN = '**/{.git,node_modules,.vscode,out,dist,build,.next,.cache,__pycache__,.pytest_cache}/**';

/**
 * Represents a workspace item (file or folder)
 */
export interface WorkspaceItem {
    type: 'file' | 'folder';
    relativePath: string;
    uri: vscode.Uri;
}

/**
 * Discovers all files in the workspace, respecting ignore patterns
 */
export async function discoverWorkspaceFiles(): Promise<vscode.Uri[]> {
    const files = await vscode.workspace.findFiles('**/*', DEFAULT_EXCLUDE_PATTERN);
    return files.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
}

/**
 * Extracts unique folder paths from a list of file URIs
 */
export function extractFolderPaths(files: vscode.Uri[], workspaceRoot: string): string[] {
    const folderSet = new Set<string>();
    
    for (const file of files) {
        const relativePath = path.relative(workspaceRoot, file.fsPath);
        const dirPath = path.dirname(relativePath);
        
        if (dirPath && dirPath !== '.') {
            // Add all parent directories
            const parts = dirPath.split(path.sep);
            let currentPath = '';
            for (const part of parts) {
                currentPath = currentPath ? path.join(currentPath, part) : part;
                folderSet.add(currentPath);
            }
        }
    }
    
    return Array.from(folderSet).sort();
}

/**
 * Builds a list of workspace items (folders and files) for the picker
 */
export async function buildWorkspaceItems(): Promise<WorkspaceItem[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return [];
    }
    
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const files = await discoverWorkspaceFiles();
    const folders = extractFolderPaths(files, workspaceRoot);
    
    const items: WorkspaceItem[] = [];
    
    // Add folders first
    for (const folder of folders) {
        items.push({
            type: 'folder',
            relativePath: folder,
            uri: vscode.Uri.file(path.join(workspaceRoot, folder))
        });
    }
    
    // Add files
    for (const file of files) {
        const relativePath = path.relative(workspaceRoot, file.fsPath);
        items.push({
            type: 'file',
            relativePath,
            uri: file
        });
    }
    
    return items;
}

/**
 * Expands folder selections into their contained files
 */
export function expandFolderSelections(
    selectedItems: WorkspaceItem[],
    allItems: WorkspaceItem[]
): WorkspaceItem[] {
    const resultSet = new Set<string>();
    const fileItems = allItems.filter(item => item.type === 'file');
    
    for (const item of selectedItems) {
        if (item.type === 'file') {
            resultSet.add(item.relativePath);
        } else {
            // Expand folder to all files within it
            const folderPrefix = item.relativePath + path.sep;
            for (const fileItem of fileItems) {
                if (fileItem.relativePath.startsWith(folderPrefix) || 
                    fileItem.relativePath === item.relativePath) {
                    resultSet.add(fileItem.relativePath);
                }
            }
        }
    }
    
    // Return file items that match the result set, sorted
    return fileItems
        .filter(item => resultSet.has(item.relativePath))
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Reads the content of a file
 */
export async function readFileContent(uri: vscode.Uri): Promise<string> {
    const content = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(content).toString('utf-8');
}

