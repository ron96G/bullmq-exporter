ARG VERSION
ARG COMMIT
ARG NPM_REGISTRY
ARG BASE_REPO
ARG NODE_VERSION
ARG ALPINE_VERSION

# STAGE 1: Build app
FROM $BASE_REPO/node:$NODE_VERSION-alpine$ALPINE_VERSION as builder

ENV VERSION=${VERSION}
ENV COMMIT=${COMMIT}

ARG NPM_REGISTRY
ARG UID=510
ARG GID=510

RUN apk update && \
    apk upgrade

RUN mkdir -p /usr/src/app/node_modules && \
    addgroup -g ${GID} app && \
    adduser -h /usr/src/app -G app -u ${UID} -D app && \
    chown -R ${UID}:${GID} /usr/src/app

WORKDIR /usr/src/app
COPY --chown=${UID}:${GID} package*.json .npmrc ./ 
USER app
COPY --chown=${UID}:${GID} . .
RUN npm install --registry=${NPM_REGISTRY}
RUN npm run build

# STAGE 2: Run app
FROM $BASE_REPO/node:$NODE_VERSION-alpine$ALPINE_VERSION

ENV VERSION=${VERSION}
ENV COMMIT=${COMMIT}

ARG NPM_REGISTRY
ARG UID=510
ARG GID=510

RUN apk update && \
    apk upgrade

RUN mkdir -p /usr/src/app/node_modules && \
    addgroup -g ${GID} app && \
    adduser -h /usr/src/app -G app -u ${UID} -D app && \
    chown -R ${UID}:${GID} /usr/src/app

WORKDIR /usr/src/app
COPY  --chown=${UID}:${GID} package*.json .npmrc ./
USER app
RUN npm ci --only=production --registry=${NPM_REGISTRY}
COPY --chown=${UID}:${GID} --from=builder /usr/src/app/dist ./dist

# EXPOSE 8080
CMD [ "node", "dist/server.js" ]

