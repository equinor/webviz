ARG NODE_TAG="18.20.8-alpine@sha256:929b04d7c782f04f615cf785488fed452b6569f87c73ff666ad553a7554f0006"

FROM node:${NODE_TAG}

USER node


COPY --chown=node:node . /usr/src/app

WORKDIR /usr/src/app/frontend

RUN npm config set fetch-retry-mintimeout 100000
RUN npm config set fetch-retry-maxtimeout 600000

RUN npm ci --ignore-scripts

CMD ["npm", "run", "dev"]
