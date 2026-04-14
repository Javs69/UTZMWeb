const path = require('path')
const webpack = require('webpack')

// Usar Edge (Chromium) cuando Chrome no está instalado
if (!process.env.CHROME_BIN) {
  process.env.CHROME_BIN =
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      { pattern: 'tests/unit/**/*.spec.js', watched: false },
    ],
    preprocessors: {
      'tests/unit/**/*.spec.js': ['webpack'],
    },
    webpack: {
      mode: 'development',
      devtool: 'inline-source-map',
      module: {
        rules: [
          {
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: { chrome: 100 }, modules: false }],
                  ['@babel/preset-react', { runtime: 'automatic' }],
                ],
              },
            },
          },
        ],
      },
      resolve: {
        extensions: ['.js', '.jsx'],
        alias: {
          '@': path.resolve(__dirname, 'frontend/src'),
        },
      },
      plugins: [
        new webpack.DefinePlugin({
          'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: '' }),
          'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
        }),
      ],
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadless'],
    singleRun: true,
    concurrency: Infinity,
  })
}
