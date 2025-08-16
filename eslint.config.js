import js from '@eslint/js';
import globals from 'globals';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import css from '@eslint/css';

import stylistic from '@stylistic/eslint-plugin';

export default [
  // Global ignores - must come first
  {
    ignores: ['node_modules/**', '**/dist/**', '**/build/**', 'rules.json', 'package-lock.json']
  },

  
  
  // JavaScript configuration
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'array-callback-return': [
        'error',
        { checkForEach: true }
      ],
      'constructor-super': 'error',
      'no-cond-assign': [
        'error',
        'always'
      ],
      'no-compare-neg-zero': 'error',
      'no-const-assign': 'error',
      'no-constructor-return': 'warn',
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error'
    }
  },
  
  // JSON configuration
  {
    files: ['**/*.json'],
    ignores: ['package-lock.json', 'rules.json'],
    language: 'json/json',
    ...json.configs['recommended']
  },
  
  // JSONC configuration
  {
    files: ['**/*.jsonc'],
    language: 'json/jsonc',
    ...json.configs['recommended']
  },
  
  // JSON5 configuration
  {
    files: ['**/*.json5'],
    language: 'json/json5',
    ...json.configs['recommended']
  },
  
  // Markdown configuration
  {
    files: ['**/*.md'],
    processor: markdown.processors.markdown
  },
  
  // CSS configuration
  {
    files: ['**/*.css'],
    language: 'css/css',
    ...css.configs['recommended'],
    rules: {
      // Disable the baseline warning for ui-monospace
      'css/use-baseline': 'off'
    }
  },
  {
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      '@stylistic/semi': 'error',
      '@stylistic/arrow-parens': 'error',
      '@stylistic/arrow-spacing': [
        'error',
        {
          'before': true,
          'after': true
        }
      ],
      '@stylistic/block-spacing': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'never'],
      '@stylistic/quotes': [
        'error',
        'single'
      ]
    }
  }
];
