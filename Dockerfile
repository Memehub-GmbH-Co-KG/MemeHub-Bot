FROM node:14-alpine
WORKDIR /usr/src/memehub-bot
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "npm", "run", "start" ]