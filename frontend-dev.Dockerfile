ARG NODE_TAG="24.13.0-alpine@sha256:cd6fb7efa6490f039f3471a189214d5f548c11df1ff9e5b181aa49e22c14383e"

FROM node:${NODE_TAG}

USER node


COPY --chown=node:node . /usr/src/app

WORKDIR /usr/src/app/frontend

RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

RUN npm ci --ignore-scripts

CMD ["npm", "run", "dev"]
