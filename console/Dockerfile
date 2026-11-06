# syntax=docker/dockerfile:1
# console: pnpm build on node, served by the unprivileged nginx image (uid 101, port 8080).
# Build: docker build -t console --build-arg VERSION=0.1.0 console

FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile && pnpm build

FROM nginxinc/nginx-unprivileged:1.27-alpine
ARG VERSION=0.1.0
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="console" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"
COPY --from=build /app/apps/web-ui/dist /usr/share/nginx/html
# Custom server template (the image envsubst-renders templates into conf.d at startup).
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 8080
