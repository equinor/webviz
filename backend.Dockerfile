FROM golang:1.20-bookworm as golang-builder
ENV GO111MODULE=on

WORKDIR /app


COPY ./backend/goaggregate .
RUN CGO_ENABLED=1 go build -buildmode=c-shared -o golibrary.so main.go

FROM python:3.11-slim@sha256:ad2c4e5884418404c5289acad4a471dde8500e24ba57ad574cdcae46523e507a as runner

RUN useradd --create-home --uid 1234 appuser  # Changing to non-root user early
COPY --chown=appuser ./backend /home/appuser/backend
COPY --chown=appuser --from=golang-builder ./app/golibrary.so ./home/appuser/backend/goaggregate/golibrary.so
RUN chmod 755 /home/appuser/backend

USER 1234
WORKDIR /home/appuser/backend

ENV PATH="${PATH}:/home/appuser/.local/bin"
RUN pip install poetry \
    && poetry export -f requirements.txt -o requirements.txt \
    && pip install -r requirements.txt


CMD exec uvicorn --proxy-headers --timeout-keep-alive 300 --host=0.0.0.0 $UVICORN_ENTRYPOINT 