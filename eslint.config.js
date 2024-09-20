import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
        rules: {
            eqeqeq: 'error',
            'no-console': 'warn',
            indent: ['error', 4, { SwitchCase: 1 }],
            camelcase: 'error',
            'prettier/prettier': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            'padding-line-between-statements': [
                'warn',
                { blankLine: 'always', prev: 'block-like', next: '*' },
                { blankLine: 'always', prev: 'block', next: '*' },
                { blankLine: 'always', prev: '*', next: ['block', 'block-like'] },
                { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
                { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
                { blankLine: 'always', prev: ['export', 'import'], next: '*' },
                { blankLine: 'any', prev: 'import', next: 'import' },
                { blankLine: 'any', prev: 'export', next: 'export' },
            ],
        },
        languageOptions: {
            ecmaVersion: 6,
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es6,
                ...globals.jest,
            },
        },
        files: ['**/*.js', '**/*.ts'],
        ignores: ['build/**'],
    },
];
