import JSON5 from 'json5';

export function parseFontPreset(source, name) {
  const assignment = source.match(/=\s*({[\s\S]*})\s*;?\s*$/);
  if (!assignment?.[1]) {
    throw new SyntaxError(`invalid soundfont preset "${name}"`);
  }
  const preset = JSON5.parse(assignment[1]);
  if (!Array.isArray(preset.zones)) {
    throw new SyntaxError(`soundfont preset "${name}" has no zones`);
  }
  return preset.zones;
}
