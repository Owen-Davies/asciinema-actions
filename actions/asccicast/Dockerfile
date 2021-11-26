FROM node:14-alpine3.10 as ts-compiler
WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install && npm install typescript -g
COPY ../.. ./
RUN npm run build

FROM node:14-alpine3.10 as ts-remover
WORKDIR /usr/app
COPY --from=ts-compiler /usr/app/package*.json ./
COPY --from=ts-compiler /usr/app/dist ./
RUN npm install --only=production

FROM gcr.io/distroless/nodejs:14
ENV ASCCINEMA_MARKDOWN_FILE=""
WORKDIR /usr/app
COPY --from=ts-remover /usr/app ./
VOLUME /github/workflow
ENTRYPOINT ["/nodejs/bin/node", "/usr/app/cli.js"]