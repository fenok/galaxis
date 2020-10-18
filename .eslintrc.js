module.exports = {
    root: true,
    env: {
        browser: true,
        node: true,
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
            },
        },
    ],
};
