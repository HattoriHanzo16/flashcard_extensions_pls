const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    popup: './src/popup/index.ts',
    content: './src/content/index.ts',
    background: './src/background/index.ts',
    options: './src/options/options.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'assets', to: 'assets' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/popup/popup.css', to: 'popup.css' },
        { from: 'src/options/options.html', to: 'options.html' },
        { from: 'src/options/options.css', to: 'options.css' }
      ],
    }),
  ],
}; 