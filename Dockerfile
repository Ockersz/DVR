# Production Dockerfile for DVR Video Wall
FROM python:3.12-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy application files
COPY . /app/

# Download go2rtc binary for target architecture if not present
RUN if [ ! -f /app/go2rtc ]; then \
    ARCH=$(uname -m); \
    if [ "$ARCH" = "x86_64" ]; then TARGET="go2rtc_linux_amd64"; \
    elif [ "$ARCH" = "aarch64" ]; then TARGET="go2rtc_linux_arm64"; \
    else TARGET="go2rtc_linux_arm"; fi; \
    curl -L -o /app/go2rtc "https://github.com/AlexxIT/go2rtc/releases/latest/download/$TARGET"; \
    fi && chmod +x /app/go2rtc /app/run.py /app/gen_config.py

# Expose ports:
# 8085: Web Dashboard
# 1984: go2rtc API & WebRTC signaling
# 8555: WebRTC TCP/UDP media
# 8560: RTSP internal
EXPOSE 8085 1984 8555 8555/udp 8560

# Run supervisor in foreground
CMD ["python3", "run.py", "run"]
