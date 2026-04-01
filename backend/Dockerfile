FROM node:20-alpine

WORKDIR /app

ENV TZ=America/Sao_Paulo
RUN ln -sf /usr/share/zoneinfo/$TZ /etc/localtime

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

EXPOSE 3870

ENV NODE_ENV=production
ENV PORT=3870

CMD ["node", "src/index.js"]
