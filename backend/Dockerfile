FROM node:24-alpine

WORKDIR /app

COPY package.json ./package.json
COPY backend/package.json ./backend/package.json

RUN npm install

COPY backend ./backend

WORKDIR /app/backend

EXPOSE 3000

CMD ["npm", "run", "dev"]