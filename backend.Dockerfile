FROM python:3.8-slim@sha256:dd13c1d6433ecfa15dcf774d8fcce87cf790f0f85f96d21d2e81b31ad2e42e13

# For now we need git since SUMO Python packages are not deployed to PyPI
RUN apt-get update && apt-get install -y git  \
    && useradd --create-home --uid 1234 appuser  # Changing to non-root user early

USER 1234

COPY --chown=appuser ./backend /home/appuser/backend
WORKDIR /home/appuser/backend

ENV PATH="${PATH}:/home/appuser/.local/bin"
RUN pip install poetry \
    && poetry export --without-hashes -f requirements.txt -o requirements.txt \
    && pip install -r requirements.txt

CMD ["uvicorn", "--proxy-headers", "--host=0.0.0.0", "--port=5000", "src.fastapi_app.main:app"]
