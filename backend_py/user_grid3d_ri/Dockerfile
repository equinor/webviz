FROM ubuntu:24.04

# Set non-interactive mode to avoid prompts during build
ARG DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get -y upgrade; \
    \
    apt-get install -y --no-install-recommends \
        software-properties-common \
        ca-certificates \
        gnupg; \
    \
    add-apt-repository -y ppa:deadsnakes/ppa; \
    apt-get update; \
    \
    apt-get install -y --no-install-recommends \
        libgl1 \
        libglx-mesa0 \
        libglu1-mesa \
        libhdf5-dev \
        libgomp1 \
        unzip \
        python3.13 \
        python3.13-venv; \
    \
    apt-get -y autoremove --purge; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1234 appuser
USER 1234

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN python3.13 -m ensurepip --upgrade
RUN python3.13 -m pip install --upgrade pip setuptools wheel
RUN python3.13 -m pip install --upgrade poetry==2.1.4

# This can probably be optimized wrt space usage by fetching and preparing Resinsight using a multi-stage build
ADD --chown=appuser https://github.com/CeetronSolutions/ResInsight/releases/download/webviz.test.0.0.2/ResInsight-Ubuntu_20.04_gcc.tar.gz /home/appuser/ri_bin/dist_archive/
WORKDIR /home/appuser/ri_bin
RUN tar xvf ./dist_archive/ResInsight*.tar.gz
ENV RESINSIGHT_EXECUTABLE=/home/appuser/ri_bin/ResInsight

ENV VIRTUAL_ENV=/home/appuser/venv
RUN python3.13 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

ENV POETRY_KEYRING_ENABLED=false
ENV PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring

WORKDIR /home/appuser/backend_py/user_grid3d_ri
COPY --chown=appuser ./backend_py/user_grid3d_ri/pyproject.toml  /home/appuser/backend_py/user_grid3d_ri
COPY --chown=appuser ./backend_py/user_grid3d_ri/poetry.lock     /home/appuser/backend_py/user_grid3d_ri
RUN poetry install --only main --no-root --no-directory

WORKDIR /home/appuser/ri_bin/Python
RUN pip install .

COPY --chown=appuser ./backend_py/libs /home/appuser/backend_py/libs
COPY --chown=appuser ./backend_py/user_grid3d_ri/user_grid3d_ri /home/appuser/backend_py/user_grid3d_ri/user_grid3d_ri
WORKDIR /home/appuser/backend_py/user_grid3d_ri
RUN poetry install --only main

# Relevant uvicorn environment variables are: UVICORN_PORT, UVICORN_RELOAD
CMD ["uvicorn", "user_grid3d_ri.fastapi_app:app", "--host", "0.0.0.0"]

