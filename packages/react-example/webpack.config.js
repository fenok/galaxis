const path = require('path');

const clientConfig = {
    entry: './src/client/client.ts',
    target: 'web',
    resolve: {
        extensions: ['.js', '.ts', '.tsx'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
        ],
    },
    output: {
        filename: 'client.bundle.js',
        path: path.resolve(__dirname, 'dist', 'static'),
    },
};

const serverConfig = {
    entry: './src/client/server.ts',
    target: 'node',
    resolve: {
        extensions: ['.js', '.ts', '.tsx'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
        ],
    },
    output: {
        filename: 'server.bundle.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'commonjs2',
    },
};

module.exports = [clientConfig, serverConfig];
