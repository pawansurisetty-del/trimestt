FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.js seed.js test_api.js ./
COPY lib ./lib
COPY public ./public
COPY scripts ./scripts
ENV NODE_ENV=production
ENV TRIMESTT_DATA=/data
EXPOSE 3006
CMD ["node", "server.js"]
