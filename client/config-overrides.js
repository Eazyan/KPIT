const webpack = require('webpack');

module.exports = function override(config) {
  // Добавляем полифилл для буфера
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "buffer": require.resolve("buffer/"),
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