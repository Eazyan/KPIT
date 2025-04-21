FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

RUN npm install --save @types/recharts

# Для режима разработки и горячей перезагрузки
ENV CHOKIDAR_USEPOLLING=true
ENV WDS_SOCKET_PORT=0

COPY . .

EXPOSE 3000

CMD ["npm", "start"] 