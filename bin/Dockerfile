FROM docker:25.0-dind-rootless

COPY ./*/thv /usr/local/bin/thv

USER rootless
CMD ["thv", "serve"]
