FROM node:23.11.0-alpine AS build
WORKDIR /usr/src/app
COPY --chown=node:node . .
RUN npm install
RUN npm run build
ENTRYPOINT [ "node", "dist/main.js" ]
