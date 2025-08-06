FROM docker:dind

RUN apk add --no-cache dbus dbus-x11 gnome-keyring libsecret

RUN setcap -r /usr/bin/gnome-keyring-daemon 2>/dev/null || true

ENV XDG_CURRENT_DESKTOP=GNOME \
    XDG_SESSION_DESKTOP=gnome \
    DESKTOP_SESSION=gnome \
    # a writable runtime dir (glib falls back to /tmp if this is unset)
    XDG_RUNTIME_DIR=/tmp/xdg-runtime
ENV DOCKER_HOST=unix:///var/run/docker.sock

COPY --chmod=755 linux-x64/thv        /usr/local/bin/thv
COPY ./ephemeral/entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]
CMD []
