ARG NODE_TAG="18.8-alpine@sha256:f08168de449131d96a16a9c042f96dc3169678907f120eee8d5ecc10ca75bb48"

FROM node:${NODE_TAG}

USER node

COPY --chown=node:node . /usr/src/app

WORKDIR /usr/src/app/frontend

RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

RUN npm ci --ignore-scripts

CMD ["npm", "run", "dev"]
