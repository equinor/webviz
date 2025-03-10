ARG NODE_TAG="18.20-alpine@sha256:b33d7471a6a5106cceb3b6e4368841e06338ff6e5e8b2ff345e2e17f15902d7d"
ARG NGINX_TAG="1.23-alpine@sha256:b5fe08305969d68f9d44309ea30f02a7dfbefe6e429f8c3f3f348fa45600f8b2"

###########################################
# Build frontend assets and compress them #
###########################################

FROM node:${NODE_TAG} AS builder_frontend

USER node

COPY --chown=node:node . /usr/src/app

WORKDIR /usr/src/app/frontend
ENV NODE_ENV production

# Building wsc requires increasing memory allocated to Node
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm ci --include=dev && npm run build && node compress_static.cjs

###########################################
# Compile brotli extension to nginx image #
###########################################

FROM nginxinc/nginx-unprivileged:${NGINX_TAG} AS builder_nginx

USER root
RUN apk add abuild musl-dev make mercurial gcc

USER nginx
RUN cd /tmp \
    && hg clone -r ${NGINX_VERSION}-${PKG_RELEASE} https://hg.nginx.org/pkg-oss

WORKDIR /tmp/pkg-oss/alpine
RUN make abuild-module-brotli

USER root
RUN apk add $(. ./abuild-module-brotli/APKBUILD; echo $makedepends)

USER nginx
RUN make module-brotli \
    && mkdir /tmp/packages \
    && mv -v ~/packages/*/*/*.apk /tmp/packages

############################################################
# Final image - import artifacts from previous base images #
############################################################

FROM nginxinc/nginx-unprivileged:${NGINX_TAG}

COPY --from=builder_nginx /tmp/packages /tmp/packages
COPY --from=builder_frontend /usr/src/app/frontend/dist /usr/share/nginx/dist

COPY ./nginx.conf /etc/nginx/nginx.conf

USER root
RUN apk add --no-cache --allow-untrusted /tmp/packages/nginx-module-brotli-${NGINX_VERSION}*.apk \
    && rm -rf /tmp/packages \
    && chown -R $UID:0 /usr/share/nginx \
    && chmod -R g+r /usr/share/nginx

# What we really want to use here is $UID - however Radix requires it to be explicit in order to recognize non-root Docker image:
USER 101

CMD ["nginx"]
