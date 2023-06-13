FROM python:3.10-slim@sha256:79aa96a96eeccf6e13a240f24c8630dc1069efd20f8c289c8f90914dcae83c11

# For now we need git since SUMO Python packages are not deployed to PyPI
RUN apt-get update && apt-get install -y git  \
    && useradd --create-home --uid 1234 appuser  # Changing to non-root user early

USER 1234

COPY --chown=appuser ./backend /home/appuser/backend
WORKDIR /home/appuser/backend

ENV PATH="${PATH}:/home/appuser/.local/bin"
RUN pip install poetry \
    && poetry export --without-hashes -f requirements.txt -o requirements.txt \
    && pip install -r requirements.txt \
    && pip install git+https://github.com/hanskallekleiv/fmu-sumo.git@a64e15043ae24cf4f13ed900afb8aa66d41d42e1
CMD exec uvicorn --proxy-headers --host=0.0.0.0 $UVICORN_ENTRYPOINT
