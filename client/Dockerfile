FROM node:18-alpine

WORKDIR /app

# Копируем только файлы зависимостей для лучшего кэширования
COPY package.json package-lock.json ./

# Установка зависимостей с использованием кэша для ускорения
RUN npm config set cache /app/.npm-cache && \
    npm ci --prefer-offline --no-optional && \
    npm install --save @types/recharts && \
    npm cache clean --force

ENV CHOKIDAR_USEPOLLING=true \
    WDS_SOCKET_PORT=0 \
    NODE_ENV=development \
    FAST_REFRESH=true \
    GENERATE_SOURCEMAP=true \
    SKIP_PREFLIGHT_CHECK=true

# Копируем исходный код
COPY . .

EXPOSE 3000

# Запуск в режиме разработки с поддержкой горячей перезагрузки
CMD ["npm", "start"] 
