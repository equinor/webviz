ARG NODE_TAG="18.8-alpine@sha256:f08168de449131d96a16a9c042f96dc3169678907f120eee8d5ecc10ca75bb48"

FROM node:${NODE_TAG}

USER node

WORKDIR /usr/src/app/frontend

RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

COPY --chown=node:node ./frontend/package*.json ./

RUN npm ci --ignore-scripts

COPY --chown=node:node ./frontend/ ./

CMD ["npm", "run", "dev"]
