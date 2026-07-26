import { defineConfig } from 'vite';
import bundleAudioWorkletPlugin from 'vite-plugin-bundle-audioworklet';

export default defineConfig({
  plugins: [bundleAudioWorkletPlugin()],
});
