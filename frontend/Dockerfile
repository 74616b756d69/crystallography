FROM node:24-alpine

WORKDIR /app

COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN npm install

COPY frontend ./frontend

WORKDIR /app/frontend

EXPOSE 5173

CMD ["sh", "-lc", "cd /app && npm install && cd /app/frontend && npm run dev"]