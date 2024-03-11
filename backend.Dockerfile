FROM python:3.11-slim@sha256:ad2c4e5884418404c5289acad4a471dde8500e24ba57ad574cdcae46523e507a

RUN useradd --create-home --uid 1234 appuser  # Changing to non-root user early

USER 1234

COPY --chown=appuser ./backend /home/appuser/backend
WORKDIR /home/appuser/backend

ENV PATH="${PATH}:/home/appuser/.local/bin"
RUN pip install poetry \
    && poetry export -f requirements.txt -o requirements.txt \
    && pip install -r requirements.txt

CMD exec uvicorn --proxy-headers --host=0.0.0.0 backend.main:app
