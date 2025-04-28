const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "buffer": require.resolve("buffer/")//,
    // "crypto": require.resolve("crypto-browserify"),
    // "stream": require.resolve("stream-browserify")
  };
  
  // Добавляем плагин для предоставления Buffer
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  return config;
}; 