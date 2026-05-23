FROM node:24-alpine

WORKDIR /app/frontend

COPY frontend/package.json ./package.json

RUN npm install

COPY frontend ./

EXPOSE 5173

CMD ["sh", "-lc", "npm install && npm run dev"]