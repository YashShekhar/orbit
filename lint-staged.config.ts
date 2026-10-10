export default {
  '*.{ts,tsx,css}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,jsonc,md,html,yml,yaml,svg}': ['prettier --write'],
};
