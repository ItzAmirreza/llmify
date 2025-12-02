# Llmify

A VS Code/Cursor extension that exports selected folders and files from your workspace as well-structured markdown, perfect for feeding into LLMs.

VSCode store link:
https://marketplace.visualstudio.com/items?itemName=AmirrezaBadpa.llmify
OpenVSX:
https://open-vsx.org/extension/AmirrezaBadpa/llmify

## Features

- **One-click export**: Click the "Llmify" button in the status bar to open the file picker
- **Flexible selection**: Select individual files, entire folders, or any combination
- **Smart markdown output**: Generates a structured markdown with:
  - A file structure overview at the top
  - Each file's content in properly fenced code blocks with language highlighting
- **Clipboard ready**: Output is automatically copied to your clipboard

## Usage

1. Open a workspace folder in VS Code/Cursor
2. Click the **"Llmify"** button in the status bar (bottom right)
3. Select the folders and/or files you want to export
4. Press Enter or click OK
5. The markdown is now in your clipboard - paste it into your LLM chat!

## Output Format

The generated markdown follows this structure:

```markdown
## Structure

- src/
  - extension.ts
  - utils.ts
- package.json
- README.md

## File: src/extension.ts

\`\`\`typescript
// file contents here
\`\`\`

## File: src/utils.ts

\`\`\`typescript
// file contents here
\`\`\`

...
```

## Ignored Paths

The following directories are automatically excluded from the file picker:

- `.git`
- `node_modules`
- `.vscode`
- `out`
- `dist`
- `build`
- `.next`
- `.cache`
- `__pycache__`
- `.pytest_cache`

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.74.0+

### Setup

```bash
npm install
npm run compile
```

### Running the Extension

1. Open this project in VS Code
2. Press `F5` to launch the Extension Development Host
3. Test the extension in the new window

### Building

```bash
npm run vscode:prepublish
```

## License

MIT
