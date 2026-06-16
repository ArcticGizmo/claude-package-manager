# claude-package-manager

A CLI tool for managing Claude Code plugins, hooks, and extensions.

## Install

```bash
# From GitHub (before npm publish)
npm install -g github:JonHowell/claude-package-manager
```

## Usage

```bash
cpm sessions        # list active Claude Code sessions
cpm --help
```

## Local development

```bash
git clone https://github.com/JonHowell/claude-package-manager
cd claude-package-manager
pnpm install
pnpm add -g .   # registers `cpm` globally, pointing at ./dist/index.js
```

Open two terminals:

```bash
# Terminal 1 — rebuilds on every save
pnpm dev

# Terminal 2 — each invocation picks up the latest build
cpm sessions
```

`pnpm dev` runs `tsup --watch`, which rebuilds `dist/index.js` in ~30ms on any source change. Because `pnpm link --global` points directly at that file, there's nothing else to do — save and re-run.
