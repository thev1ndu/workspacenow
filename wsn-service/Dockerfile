# syntax=docker/dockerfile:1

ARG GO_VERSION=1.26
FROM golang:${GO_VERSION}-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=dev
ARG GIT_SHA=unknown
RUN CGO_ENABLED=0 go build -trimpath \
      -ldflags "-s -w -X github.com/thev1ndu/workspacenow/wsn-service/config.Version=${VERSION}" \
      -o /out/wsn-service .

FROM gcr.io/distroless/static-debian12:nonroot
ARG VERSION=dev
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="wsn-service" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"
COPY --from=build /out/wsn-service /wsn-service
# distroless :nonroot already runs as uid/gid 65532 with no shell; stated explicitly for clarity.
USER 65532:65532
EXPOSE 8080 8081
ENTRYPOINT ["/wsn-service"]
