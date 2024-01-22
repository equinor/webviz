
FROM golang:latest

RUN useradd --create-home --uid 1234 appuser
ENV PROJECT_DIR=/app \
    GO111MODULE=on \
    CGO_ENABLED=1
WORKDIR /app

COPY ./backend_go/surface_intersect/ ./

RUN chown -R appuser:appuser /app

USER 1234
# Get CompileDaemon
RUN go get github.com/githubnemo/CompileDaemon
RUN go install github.com/githubnemo/CompileDaemon
RUN go get -u github.com/gin-gonic/gin

# The build flag sets how to build after a change has been detected in the source code
# The command flag sets how to run the app after it has been built
ENTRYPOINT CompileDaemon --build="go build main.go" --command="./main"