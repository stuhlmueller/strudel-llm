import { describe, expect, it } from 'vitest';
import { parseFontPreset } from './soundfont-parser.mjs';

describe('parseFontPreset', () => {
  it('parses a WebAudioFont variable assignment without executing it', () => {
    const source = `console.log('loaded');
      var _tone_test = {
        zones: [{ keyRangeLow: 0, keyRangeHigh: 127 }],
      };`;

    expect(parseFontPreset(source, 'test')).toEqual([{ keyRangeLow: 0, keyRangeHigh: 127 }]);
  });

  it('rejects source without a preset assignment', () => {
    expect(() => parseFontPreset('console.log("missing")', 'missing')).toThrow('invalid soundfont preset "missing"');
  });

  it('rejects presets without zones', () => {
    expect(() => parseFontPreset('var _tone_empty = {};', 'empty')).toThrow('soundfont preset "empty" has no zones');
  });
});
