FROM ubuntu:22.04

ENV SHELL=/bin/bash \
    USERNAME=codespace \
    USER_UID=1001 \
    USER_GID=1001 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends sudo curl gnupg ca-certificates software-properties-common \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && NODE_MAJOR=20 \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update -y \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get -y clean \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid $USER_GID $USERNAME \
    && useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && HOME_DIR="/home/${USERNAME}/" \
    && chown -R ${USERNAME}:${USERNAME} ${HOME_DIR} \
    && chmod -R g+rw "${HOME_DIR}" \
    && find "${HOME_DIR}" -type d | xargs -n 1 chmod g+s \
    && add-apt-repository ppa:deadsnakes/ppa -y \
    && apt-get update -y \
    && apt-get install python3.11-venv -y

CMD [ "sleep", "infinity" ]
