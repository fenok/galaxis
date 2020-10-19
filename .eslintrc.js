module.exports = {
    root: true,
    env: {
        browser: true,
        node: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 2017,
    },
    extends: ['eslint:recommended', 'prettier'],
    overrides: [
        {
            files: ['**/*.ts', '**/*.tsx'],
            plugins: ['@typescript-eslint'],
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
                'prettier/@typescript-eslint',
            ],
            parser: '@typescript-eslint/parser',
            rules: {
                '@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
                '@typescript-eslint/no-unnecessary-condition': 'error',
                '@typescript-eslint/no-empty-interface': 'off',
            },
        },
    ],
};
