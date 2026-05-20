ARG NODE_TAG="24.14.1-alpine@sha256:01743339035a5c3c11a373cd7c83aeab6ed1457b55da6a69e014a95ac4e4700b"

FROM node:${NODE_TAG}

USER node


WORKDIR /usr/src/app/frontend

RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

COPY --chown=node:node frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY --chown=node:node frontend/ ./

CMD ["npm", "run", "dev"]
