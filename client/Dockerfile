FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install --save-dev crypto-browserify stream-browserify

# Для режима разработки и горячей перезагрузки
ENV CHOKIDAR_USEPOLLING=true
ENV WDS_SOCKET_PORT=0

COPY . .

EXPOSE 3000

CMD ["npm", "start"] 