# @strudel/tidal

This is an experiment in implementing tree-sitter for parsing haskell.

```sh
sfw pnpm install
pnpm build
pnpm dev
```

The Vite configuration bundles Strudel's audio worklets. The build copies the current Tree-sitter runtime and Haskell grammar WebAssembly files into `public/`.
