FROM python:3.11-slim

RUN useradd --create-home --uid 1234 appuser
USER 1234

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN python3 -m pip install --user pipx
RUN python3 -m pipx ensurepath
RUN pipx install poetry==1.8.2

ENV VIRTUAL_ENV=/home/appuser/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /home/appuser/backend_py/user_grid3d_vtk

COPY --chown=appuser ./backend_py/user_grid3d_vtk/pyproject.toml  /home/appuser/backend_py/user_grid3d_vtk
COPY --chown=appuser ./backend_py/user_grid3d_vtk/poetry.lock     /home/appuser/backend_py/user_grid3d_vtk
RUN poetry install --only main --no-root --no-directory

COPY --chown=appuser ./backend_py/user_grid3d_vtk/user_grid3d_vtk /home/appuser/backend_py/user_grid3d_vtk/user_grid3d_vtk
RUN poetry install --only main

# Relevant uvicorn environment variables are: UVICORN_PORT, UVICORN_RELOAD
CMD ["uvicorn", "user_grid3d_vtk.fastapi_app:app", "--host", "0.0.0.0"]
