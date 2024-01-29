
FROM golang:1.21

RUN useradd --create-home --uid 1234 appuser
USER 1234

RUN go install github.com/githubnemo/CompileDaemon@latest

# This is where we'll write the compiled binary to
RUN mkdir /home/appuser/gobuild

# This step is not strictly necessary, the eventual 'go mod download' will prefill the module cache
RUN mkdir /home/appuser/goscratch
WORKDIR /home/appuser/goscratch
COPY ./backend_go/surface_intersect/go.mod ./
COPY ./backend_go/surface_intersect/go.sum ./
RUN go mod download

WORKDIR /home/appuser/backend_go/surface_intersect

# The build flag sets how to build after a change has been detected in the source code
# The command flag sets how to run the app after it has been built
#
# The -race flag can be added to the build option, ie "go build -race -o /x/y/z main.go" to detect race conditions
# Beware that performance will suffer quite a bit, so don't leave it in there
CMD CompileDaemon -build="go build -o /home/appuser/gobuild/ main.go" -include=go.mod -command="/home/appuser/gobuild/main" -verbose -color
