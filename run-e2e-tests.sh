#!/bin/bash

# Build the Docker image
echo "Building e2e test Docker image..."
docker build -f e2e.Dockerfile -t toolhive-studio-e2e .

# Run the e2e tests without volume mounts
echo "Running e2e tests..."
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --privileged \
  toolhive-studio-e2e

echo "Tests completed! All test outputs are available inside the container."
echo "To access test results, you can run:"
echo "  docker run --rm -it toolhive-studio-e2e bash"
