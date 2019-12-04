var path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    target: "node",
    devtool: 'inline-source-map',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'oracle.js'
    },
    resolve: {
        extensions: ['.js', '.ts', '.json'],
    },
    externals: {
        electron: "electron"
    },
    optimization: {
        minimize: false
    },
    module: {
        rules: [{
            test: /\.ts?$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        }]
    },
    plugins: [
        new CopyPlugin([{
            from: './build'
        }, ]),
    ],
}