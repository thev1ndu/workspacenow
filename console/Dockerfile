# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:25-alpine AS build
WORKDIR /app
COPY . .
# pnpm via npm, not corepack: corepack fetches its shim at runtime and adds a network hop.
RUN npm install --global pnpm@9.12.3 && pnpm install --frozen-lockfile && pnpm build

FROM nginxinc/nginx-unprivileged:1.31-alpine
ARG VERSION=0.1.0
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="console" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"
COPY --from=build /app/apps/web-ui/dist /usr/share/nginx/html
# Custom server template (the image envsubst-renders templates into conf.d at startup).
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 8080
