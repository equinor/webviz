FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        software-properties-common \
        gpg-agent \
    && add-apt-repository -y ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        python3.13 \
        python3.13-venv \
        python3.13-dev \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.13 /usr/local/bin/python3 \
    && ln -sf /usr/bin/python3.13 /usr/local/bin/python \
    && python3.13 -m ensurepip --upgrade \
    && ln -sf /usr/local/bin/pip3.13 /usr/local/bin/pip \
    && ln -sf /usr/local/bin/pip3.13 /usr/local/bin/pip3

ENV DEBIAN_FRONTEND=
