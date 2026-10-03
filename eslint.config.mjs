import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import vueParser from 'vue-eslint-parser'

export default [
    {
        ignores: [
            'dist/**',
            'node_modules/**'
        ]
    },
    {
        ...js.configs.recommended,
        languageOptions: {
            globals: globals.browser
        },
        rules: {
            quotes: ['error', 'single'],
            semi: ['error', 'never'],
        }
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsparser,
                sourceType: 'module'
            },
            globals: globals.browser
        },
        plugins: {
            vue
        },
        rules: {
            ...vue.configs['flat/recommended'].rules,
            quotes: ['error', 'single'],
            semi: ['error', 'never'],
        }
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsparser,
            sourceType: 'module',
            globals: globals.browser
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            quotes: ['error', 'single'],
            semi: ['error', 'never'],
        }
    },
    {
        files: ['vite.config.*'],
        languageOptions: {
            globals: globals.node
        }
    }
]