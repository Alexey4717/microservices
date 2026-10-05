# Community-образы MinIO и mc больше не отдаются анонимно (Docker Hub и Quay).
# BIN=minio|mc, VERSION — тег релиза на GitHub. KEEP_CURL=1 оставляет curl (healthcheck сервера).
FROM debian:bookworm-slim

ARG TARGETARCH
ARG BIN
ARG VERSION
ARG KEEP_CURL=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && curl -fL --retry 3 -o "/usr/bin/${BIN}" \
    "https://github.com/minio/${BIN}/releases/download/${VERSION}/${BIN}.linux-${TARGETARCH}.${VERSION}" \
  && chmod +x "/usr/bin/${BIN}" \
  && if [ "$KEEP_CURL" != "1" ]; then apt-get purge -y curl && apt-get autoremove -y; fi \
  && rm -rf /var/lib/apt/lists/*
