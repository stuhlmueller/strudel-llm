import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const preset = {
  ...minimal2023Preset,
  transparent: {
    ...minimal2023Preset.transparent,
    favicons: [],
  },
};

export default defineConfig({
  images: ['public/icon.png'],
  manifestIconsEntry: false,
  preset,
});
