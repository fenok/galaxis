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
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
                'prettier/@typescript-eslint',
            ],
            plugins: ['@typescript-eslint'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: ['./tsconfig.json'],
            },
            rules: {
                '@typescript-eslint/no-use-before-define': ['error', 'nofunc'],
            },
        },
    ],
};
