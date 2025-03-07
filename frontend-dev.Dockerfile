ARG NODE_TAG="18.20-alpine@sha256:b33d7471a6a5106cceb3b6e4368841e06338ff6e5e8b2ff345e2e17f15902d7d"

FROM node:${NODE_TAG}

USER node


COPY --chown=node:node . /usr/src/app

WORKDIR /usr/src/app/frontend

RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

RUN npm ci --ignore-scripts

CMD ["npm", "run", "dev"]
