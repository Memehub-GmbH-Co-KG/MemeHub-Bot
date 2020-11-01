FROM node:15-alpine
WORKDIR /usr/src/memehub-bot
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "index.js" ]