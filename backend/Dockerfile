FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

RUN npm ci

COPY backend ./backend

WORKDIR /app/backend

EXPOSE 3000

CMD ["npm", "run", "dev"]
