FROM python:3.13-slim@sha256:1bca0202e953784ac2a1daf36ebbc9cbebed48afcfba12d1225aaab3793eca33


RUN useradd --create-home --uid 1234 appuser
USER 1234

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN python3 -m pip install --user pipx
RUN python3 -m pipx ensurepath
RUN pipx install poetry==2.1.4

ENV VIRTUAL_ENV=/home/appuser/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /home/appuser/backend_py/user_mock

COPY --chown=appuser ./backend_py/user_mock/pyproject.toml  /home/appuser/backend_py/user_mock
COPY --chown=appuser ./backend_py/user_mock/poetry.lock     /home/appuser/backend_py/user_mock
RUN poetry install --only main --no-root --no-directory

COPY --chown=appuser ./backend_py/user_mock/user_mock /home/appuser/backend_py/user_mock/user_mock
RUN poetry install --only main

# Relevant uvicorn environment variables are: UVICORN_PORT, UVICORN_RELOAD
CMD ["uvicorn", "user_mock.user_mock_app:app", "--host", "0.0.0.0"]
