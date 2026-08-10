FROM node:22-alpine
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# El backend corre en el puerto 3000 por defecto
EXPOSE 3000

CMD ["node", "src/server.js"]
