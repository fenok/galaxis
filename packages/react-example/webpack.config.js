const path = require('path');

const clientConfig = {
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',
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
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',
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
                options: {
                    presets: [
                        [
                            '@babel/env',
                            {
                                targets: {
                                    node: '12.14.1',
                                },
                            },
                        ],
                    ],
                },
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
