FROM ubuntu:latest

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=22
ENV PNPM_VERSION=8
ENV ELECTRON_DISABLE_SANDBOX=true

# Install system dependencies (matching GitHub Actions)
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    ca-certificates \
    dbus \
    dbus-x11 \
    gnome-keyring \
    libsecret-1-0 \
    libsecret-1-dev \
    xvfb \
    libxss1 \
    libxrandr2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libdrm2 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrender1 \
    libxtst6 \
    libglib2.0-0 \
    libnss3 \
    libxss1 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    lsb-release \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (for Docker Buildx if needed)
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - && \
    apt-get install -y nodejs

# Install pnpm
RUN npm install -g pnpm@${PNPM_VERSION}

# Create a non-root user for running tests
RUN useradd -m -s /bin/bash testuser && \
    usermod -aG sudo testuser && \
    echo 'testuser ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Add testuser to docker group for Docker socket access (using GID 970 to match host)
RUN groupadd -g 970 docker && \
    usermod -aG docker testuser

# Switch to testuser
USER testuser
WORKDIR /app

# Copy package files first for better caching
COPY --chown=testuser:testuser package.json pnpm-lock.yaml* ./

# Copy source files (excluding node_modules and other build artifacts)
COPY --chown=testuser:testuser main/ ./main/
COPY --chown=testuser:testuser preload/ ./preload/
COPY --chown=testuser:testuser renderer/ ./renderer/
COPY --chown=testuser:testuser e2e-tests/ ./e2e-tests/
COPY --chown=testuser:testuser bin/ ./bin/
COPY --chown=testuser:testuser scripts/ ./scripts/
COPY --chown=testuser:testuser utils/ ./utils/
COPY --chown=testuser:testuser icons/ ./icons/
COPY --chown=testuser:testuser assets/ ./assets/
COPY --chown=testuser:testuser docs/ ./docs/
COPY --chown=testuser:testuser ./*.json ./*.ts ./*.js ./*.md ./*.yml ./

# Configure pnpm for electron-forge compatibility
RUN pnpm config set node-linker hoisted

# Install dependencies (without workspace config)
RUN pnpm install

# Install ffmpeg for video recording
RUN pnpm exec playwright install ffmpeg

# Create directories for test outputs
RUN mkdir -p /app/playwright-report /app/test-videos /app/test-results

# Create entrypoint script
RUN cat > /app/entrypoint.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting D-Bus session..."
export $(dbus-launch)

echo "Starting and unlocking keyring..."
echo "ci-passphrase" | gnome-keyring-daemon --unlock --components=secrets,ssh,pkcs11 &
sleep 2

echo "Verifying thv binary works..."
pnpm run thv list

echo "Pre-building app..."
pnpm tsc -b --clean
pnpm electron-forge package

echo "Running e2e tests..."
xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" pnpm run playwright test

echo "Tests completed!"
EOF

RUN chmod +x /app/entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
