FROM python:3.11-slim

RUN useradd --create-home --uid 1234 appuser
USER 1234

COPY --chown=appuser ./backend_py/user_mock /home/appuser/user_mock

WORKDIR /home/appuser/user_mock

ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN pip install -r requirements.txt

CMD ["uvicorn", "user_mock_app:app", "--reload", "--host", "0.0.0.0", "--port", "8001"]
