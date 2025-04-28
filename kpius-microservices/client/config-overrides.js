module.exports = function override(config, env) {
    // Добавляем поддержку Buffer для работы с JWT
    config.resolve.fallback = {
        ...config.resolve.fallback,
        "buffer": require.resolve("buffer/"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify")
    };
    
    return config;
}; 