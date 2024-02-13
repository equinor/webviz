
FROM golang:1.21 AS build-stage

RUN useradd --create-home --uid 1234 appuser
USER 1234

WORKDIR /home/appuser/gosrc
COPY --chown=appuser ./backend_go/surface_query/ .

RUN go mod download
RUN go mod verify

RUN pwd
RUN ls -slatr

RUN mkdir /home/appuser/gobuild
RUN go build -o /home/appuser/gobuild/ main.go

WORKDIR /home/appuser/gobuild
RUN pwd
RUN ls -slatr


# Which image should we use for deployment?
FROM golang:1.21 AS runtime-stage

RUN useradd --create-home --uid 1234 appuser
USER 1234

ENV GIN_MODE=release

WORKDIR /home/appuser
COPY --from=build-stage /home/appuser/gobuild/main ./

CMD ./main
