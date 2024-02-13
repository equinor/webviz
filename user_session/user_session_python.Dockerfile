FROM python:3.11-slim@sha256:ad2c4e5884418404c5289acad4a471dde8500e24ba57ad574cdcae46523e507a

# Install protobuf-compiler before changing to non-root user
# Which version???
RUN apt-get update && apt-get install -y wget unzip \
    && wget https://github.com/protocolbuffers/protobuf/releases/download/v3.19.0/protoc-3.19.0-linux-x86_64.zip \
    && unzip protoc-3.19.0-linux-x86_64.zip -d /usr/local \
    && chmod +x /usr/local/bin/protoc \  
    && rm protoc-3.19.0-linux-x86_64.zip \
    && apt-get remove --purge -y wget unzip \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --uid 1234 appuser  # Changing to non-root user early

USER 1234

COPY --chown=appuser ./user_session/python /home/appuser/user_session
COPY --chown=appuser ./user_session/grid.proto /home/appuser/user_session
WORKDIR /home/appuser/user_session

# Add PATH for .local/bin for the appuser for any locally installed binaries
ENV PATH="${PATH}:/home/appuser/.local/bin"

RUN pip install --user poetry \
    && poetry export -f requirements.txt -o requirements.txt --without-hashes \
    && pip install --user -r requirements.txt

# Compile the proto file
# Since we're now a non-root user, we ensure any created files are owned by appuser by default
RUN protoc --proto_path=. --python_out=./src/backend grid.proto
RUN protoc --proto_path=. --python_out=. grid.proto
RUN ls -lrt
CMD ["ls", "-lrt"]
CMD ["sh", "-c", "exec uvicorn --proxy-headers --host=0.0.0.0 $UVICORN_ENTRYPOINT"]
