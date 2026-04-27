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
    xvfb \
    x11vnc \
    x11-utils \
    x11-apps \
    imagemagick \
    xdotool \
    fluxbox \
    novnc \
    websockify \
    dbus \
    dbus-x11 \
    gnome-keyring \
    libsecret-1-0 \
    libsecret-1-dev \
    && rm -rf /var/lib/apt/lists/*

# Codespaces-aware MOTD-style greeting: prints dev-server status + the forwarded
# noVNC URL whenever a user opens a new terminal in a Codespace. No-op locally.
COPY greeting.sh /usr/local/share/toolhive-greeting.sh
RUN chmod +x /usr/local/share/toolhive-greeting.sh \
 && echo '[ -f /usr/local/share/toolhive-greeting.sh ] && . /usr/local/share/toolhive-greeting.sh' >> /etc/bash.bashrc
