FROM python:3.11-slim@sha256:ad2c4e5884418404c5289acad4a471dde8500e24ba57ad574cdcae46523e507a

RUN useradd --create-home --uid 1234 appuser  # Changing to non-root user early

USER 1234

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN python3 -m pip install --user pipx
RUN python3 -m pipx ensurepath
RUN pipx install poetry==1.8.2

ENV VIRTUAL_ENV=/home/appuser/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /home/appuser/backend_py/primary

COPY --chown=appuser ./backend_py/primary/pyproject.toml  /home/appuser/backend_py/primary/
COPY --chown=appuser ./backend_py/primary/poetry.lock     /home/appuser/backend_py/primary/
RUN poetry install --only main --no-root --no-directory

COPY --chown=appuser ./backend_py/libs    /home/appuser/backend_py/libs
COPY --chown=appuser ./backend_py/primary /home/appuser/backend_py/primary
RUN poetry install --only main

CMD exec uvicorn --proxy-headers --host=0.0.0.0 primary.main:app
