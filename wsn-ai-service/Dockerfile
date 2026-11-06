# syntax=docker/dockerfile:1
# wsn-ai-service: Python app in a venv on python:slim, running as a dedicated non-root user.
# Build: docker build -t wsn-ai-service --build-arg VERSION=0.1.0 wsn-ai-service

FROM python:3.12-slim-bookworm AS build
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH
WORKDIR /build
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install .

FROM python:3.12-slim-bookworm
ARG VERSION=0.1.0
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="wsn-ai-service" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${GIT_SHA}"
# No bytecode writes and /tmp as HOME/TMPDIR keep the container compatible with a read-only rootfs.
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 HOME=/tmp TMPDIR=/tmp PATH=/opt/venv/bin:$PATH
RUN groupadd --system --gid 10001 ai \
    && useradd --system --uid 10001 --gid 10001 --home-dir /nonexistent --shell /usr/sbin/nologin ai
COPY --from=build /opt/venv /opt/venv
WORKDIR /app
USER 10001
EXPOSE 8090
CMD ["python", "-m", "wsn_ai_service.app"]
