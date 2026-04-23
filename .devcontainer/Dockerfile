FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

RUN apt-get update && apt-get install -y \
    libnspr4 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxss1 \
    libxtst6 \
    libatspi2.0-0 \
    libgl1-mesa-dri \
    libegl-mesa0 \
    libegl1 \
    mesa-vulkan-drivers \
    podman \
    fuse-overlayfs \
    uidmap \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /etc/containers \
    && printf '[storage]\ndriver = "vfs"\nrunroot = "/run/containers/storage"\ngraphroot = "/var/lib/containers/storage"\n' > /etc/containers/storage.conf
