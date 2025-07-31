FROM docker:dind
ENV DOCKER_HOST=unix:///var/run/docker.sock

COPY --chmod=755 linux-x64/thv        /usr/local/bin/thv
COPY ./ephemeral/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
CMD []
