FROM ubuntu:22.04

RUN apt update
RUN apt --assume-yes install software-properties-common
RUN apt --assume-yes install libgl1-mesa-glx libglu1-mesa
RUN apt --assume-yes install libhdf5-dev
RUN apt install libgomp1
RUN apt install wget
RUN apt install unzip

RUN apt --assume-yes install python3
RUN apt --assume-yes install python3-pip
RUN apt --assume-yes install python3-venv

RUN useradd --create-home --uid 1234 appuser
USER 1234

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN python3 -m pip install --user pipx
RUN python3 -m pipx ensurepath

RUN pipx install poetry==1.8.2

#RUN poetry config virtualenvs.in-project true


# ADD --chown=appuser https://nightly.link/OPM/ResInsight/workflows/ResInsightWithCache/grid-geometry-extraction/ResInsight-Ubuntu_20.04_gcc.zip  /home/appuser/ri_bin/dist_archive/
# WORKDIR /home/appuser/ri_bin
# RUN unzip ./dist_archive/ResInsight*.zip
# RUN chmod +x ResInsight
# ENV RESINSIGHT_EXECUTABLE=/home/appuser/ri_bin/ResInsight


WORKDIR /home/appuser/backend_py/user_grid3d_ri
COPY --chown=appuser ./backend_py/user_grid3d_ri/pyproject.toml  /home/appuser/backend_py/user_grid3d_ri
COPY --chown=appuser ./backend_py/user_grid3d_ri/poetry.lock     /home/appuser/backend_py/user_grid3d_ri
#RUN poetry install --only main --no-root --no-directory
RUN poetry install

# More or less the same as activating the virtual env that poetry creates
ENV VIRTUAL_ENV=/home/appuser/backend_py/user_grid3d_ri/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /home/appuser/ri_bin/Python
RUN python3 -m pip install -r requirements.txt
RUN python3 -m pip install .


COPY --chown=appuser ./backend_py/user_grid3d_ri/user_grid3d_ri /home/appuser/backend_py/user_grid3d_ri/user_grid3d_ri
WORKDIR /home/appuser/backend_py/user_grid3d_ri
RUN poetry install --only main


# Relevant uvicorn environment variables are: UVICORN_PORT, UVICORN_RELOAD
CMD ["uvicorn", "user_grid3d_ri.user_grid3d_ri_app:app", "--host", "0.0.0.0"]

