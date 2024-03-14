FROM ubuntu:22.04

# Set non-interactive mode to avoid prompts during build
ARG DEBIAN_FRONTEND=noninteractive

RUN apt update && apt install --assume-yes \
    software-properties-common \
 && add-apt-repository ppa:deadsnakes/ppa \
 && apt update && apt install --assume-yes --no-install-recommends \
    libgl1-mesa-glx \
    libglu1-mesa \
    libhdf5-dev \
    libgomp1 \
    unzip \
    python3.11 \
    python3-pip \
    python3.11-venv \
 && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1234 appuser
USER 1234

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN python3.11 -m pip install --user pipx
RUN python3.11 -m pipx ensurepath
RUN pipx install poetry==1.8.2

# This can probably be optimized wrt space usage by fetching and preparing Resinsight using a multi-stage build
ADD --chown=appuser https://nightly.link/OPM/ResInsight/workflows/ResInsightWithCache/grid-geometry-extraction/ResInsight-Ubuntu_20.04_gcc.zip  /home/appuser/ri_bin/dist_archive/
WORKDIR /home/appuser/ri_bin
RUN unzip ./dist_archive/ResInsight*.zip
RUN chmod +x ResInsight
ENV RESINSIGHT_EXECUTABLE=/home/appuser/ri_bin/ResInsight

ENV VIRTUAL_ENV=/home/appuser/venv
RUN python3.11 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

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

