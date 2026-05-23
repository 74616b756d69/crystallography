FROM node:24-alpine

WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY backend/package.json ./backend/package.json

RUN npm install

COPY backend ./backend

WORKDIR /app/backend

EXPOSE 3000

CMD ["sh", "-lc", "cd /app && npm install && cd /app/backend && npm run dev"]