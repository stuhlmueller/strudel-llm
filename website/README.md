# Strudel Website

This is the website for Strudel, deployed at [strudel.cc](https://strudel.cc).
It includes the REPL live coding editor and the documentation site.
Development requires Node.js 22.13 or newer and pnpm 11.

## Run locally

```bash
# From project root
sfw pnpm install
pnpm repl
```

## Build

```bash
cd website
pnpm build
pnpm preview
```

## Generate PWA icons

```bash
cd website
pnpm generate:pwa-assets
```

The generated assets are checked in. Their source and settings live in
`public/icon.png` and `pwa-assets.config.mjs`.
