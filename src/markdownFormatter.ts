import * as path from "path";

/**
 * Maps file extensions to markdown code fence language identifiers
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  ".js": "javascript",
  ".jsx": "jsx",
  ".ts": "typescript",
  ".tsx": "tsx",
  ".mjs": "javascript",
  ".cjs": "javascript",

  // Web
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".vue": "vue",
  ".svelte": "svelte",

  // Data formats
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".xml": "xml",
  ".toml": "toml",

  // Python
  ".py": "python",
  ".pyw": "python",
  ".pyx": "python",

  // Other languages
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".go": "go",
  ".rs": "rust",
  ".rb": "ruby",
  ".php": "php",
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".swift": "swift",
  ".m": "objectivec",
  ".mm": "objectivec",
  ".scala": "scala",
  ".clj": "clojure",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hs": "haskell",
  ".lua": "lua",
  ".r": "r",
  ".R": "r",
  ".pl": "perl",
  ".pm": "perl",

  // Shell
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "zsh",
  ".fish": "fish",
  ".ps1": "powershell",
  ".psm1": "powershell",
  ".bat": "batch",
  ".cmd": "batch",

  // Config/Docs
  ".md": "markdown",
  ".markdown": "markdown",
  ".rst": "rst",
  ".tex": "latex",
  ".ini": "ini",
  ".cfg": "ini",
  ".conf": "conf",
  ".env": "bash",

  // Database
  ".sql": "sql",
  ".graphql": "graphql",
  ".gql": "graphql",

  // Docker/DevOps
  ".dockerfile": "dockerfile",
  ".dockerignore": "gitignore",
  ".gitignore": "gitignore",

  // Other
  ".txt": "text",
  ".log": "text",
  ".csv": "csv",
};

/**
 * Gets the language identifier for a file based on its extension
 */
export function getLanguageFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  // Special case for Dockerfile without extension
  const basename = path.basename(filePath).toLowerCase();
  if (basename === "dockerfile") {
    return "dockerfile";
  }
  if (basename === "makefile") {
    return "makefile";
  }

  return EXTENSION_TO_LANGUAGE[ext] || "";
}

/**
 * Represents a file with its content for markdown generation
 */
export interface FileWithContent {
  relativePath: string;
  content: string;
}

/**
 * Builds a tree structure from file paths for the structure section
 */
function buildFileTree(files: FileWithContent[]): Map<string, string[]> {
  const tree = new Map<string, string[]>();

  for (const file of files) {
    const dir = path.dirname(file.relativePath);
    const dirKey = dir === "." ? "(root)" : dir;

    if (!tree.has(dirKey)) {
      tree.set(dirKey, []);
    }
    tree.get(dirKey)!.push(path.basename(file.relativePath));
  }

  return tree;
}

/**
 * Generates the structure section of the markdown
 */
function generateStructureSection(files: FileWithContent[]): string {
  const tree = buildFileTree(files);
  const lines: string[] = ["## Structure", ""];

  // Sort directories, putting (root) first
  const sortedDirs = Array.from(tree.keys()).sort((a, b) => {
    if (a === "(root)") return -1;
    if (b === "(root)") return 1;
    return a.localeCompare(b);
  });

  for (const dir of sortedDirs) {
    const filesInDir = tree.get(dir)!.sort();

    if (dir === "(root)") {
      for (const file of filesInDir) {
        lines.push(`- ${file}`);
      }
    } else {
      lines.push(`- ${dir}/`);
      for (const file of filesInDir) {
        lines.push(`  - ${file}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Generates the file content sections of the markdown
 */
function generateFileContentSections(files: FileWithContent[]): string {
  const sections: string[] = [];

  for (const file of files) {
    const language = getLanguageFromExtension(file.relativePath);
    const fenceStart = language ? "```" + language : "```";

    sections.push(`## File: ${file.relativePath}`);
    sections.push("");
    sections.push(fenceStart);
    sections.push(file.content);
    sections.push("```");
    sections.push("");
  }

  return sections.join("\n");
}

/**
 * Generates the complete markdown output from selected files
 */
export function generateMarkdown(files: FileWithContent[]): string {
  if (files.length === 0) {
    return "";
  }

  const structureSection = generateStructureSection(files);
  const contentSections = generateFileContentSections(files);

  return `${structureSection}\n\n${contentSections}`;
}
