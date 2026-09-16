FROM python:3.13.13-slim@sha256:35592101a8e0342f36cb17a148ed40796b38dc7f2891dcb10bb483af75b2fd4a

RUN useradd --create-home --uid 1234 appuser
USER 1234

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN python3 -m pip install --user pipx
RUN python3 -m pipx ensurepath
RUN pipx install poetry==2.4.1

ENV VIRTUAL_ENV=/home/appuser/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /home/appuser/backend_py/pyworker_default

COPY --chown=appuser ./backend_py/pyworker_default/pyproject.toml  /home/appuser/backend_py/pyworker_default
COPY --chown=appuser ./backend_py/pyworker_default/poetry.lock     /home/appuser/backend_py/pyworker_default
RUN poetry install --only main --no-root --no-directory

COPY --chown=appuser ./backend_py/libs              /home/appuser/backend_py/libs
COPY --chown=appuser ./backend_py/pyworker_default  /home/appuser/backend_py/pyworker_default
RUN poetry install --only main

CMD ["python", "-m", "pyworker_default.worker_main"]