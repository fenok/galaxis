module.exports = {
    overrides: [
        {
            files: ['**/*.ts', '**/*.tsx'],
            plugins: ['react-hooks'],
            parserOptions: {
                tsconfigRootDir: __dirname,
                project: ['./tsconfig.json'],
            },
            rules: {
                'react-hooks/rules-of-hooks': 'error',
                'react-hooks/exhaustive-deps': 'error',
            },
        },
    ],
};
