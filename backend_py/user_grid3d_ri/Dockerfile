FROM python:3.11-slim

RUN useradd --create-home --uid 1234 appuser
USER 1234

COPY --chown=appuser ./backend_py/user_grid3d_ri /home/appuser/backend_py/user_grid3d_ri

WORKDIR /home/appuser/backend_py/user_grid3d_ri

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN pip install -r requirements.txt

# Relevant uvicorn environment variables are: UVICORN_PORT, UVICORN_RELOAD
CMD ["uvicorn", "user_grid3d_ri_app:app", "--host", "0.0.0.0"]
