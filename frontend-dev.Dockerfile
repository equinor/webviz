ARG NODE_TAG="24.14.0-alpine@sha256:7fddd9ddeae8196abf4a3ef2de34e11f7b1a722119f91f28ddf1e99dcafdf114"

FROM node:${NODE_TAG}

USER node


WORKDIR /usr/src/app/frontend

RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

COPY --chown=node:node frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY --chown=node:node frontend/ ./

CMD ["npm", "run", "dev"]
