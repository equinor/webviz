# Webviz

## Development

### How to get started

The easiest way to set up a development environment (frontend + backend) is to run:
```bash
docker-compose up
```
You can then access
* frontend application at `http://localhost:8080`
* backend at `http://localhost:8080/api/`
* backend API documentation at `http://localhost:8080/api/docs`

Before you start however you need to create a file `.env` at the root of the project
with the following variable:
```
WEBVIZ_CLIENT_SECRET=...
```

### Hot reload

Both frontend and backend are hot reloaded through `docker compose` when files
in the following folders are changed:
```
./frontend/public
./frontend/src
./frontend/theme
./backend/src
```

If other files are changed through the host operativey system,
e.g. typically when a new dependency is added, the relevant component needs to be rebuilt. I.e.
`docker-compose up --build frontend` or `docker-compose up --build backend`.

### Auto-generate `/frontend/src/api`

All the content in `/frontend/src/api` is auto-generated using the defined endpoints
in the Python backend. In order to update the auto-generated code you can either

1) Run `npm run generate-api --prefix ./frontend`.
2) Use the VSCode tasks shortcut:
    a) `Ctrl + P` to open the command palette.
    b) Type `> Tasks` and enter to filter to commands only.
    c) Run task "Generate frontend code from OpenAPI".

In both cases the backend needs to already be running (e.g. using `docker-compose`
as stated above).


# Update `poetry.lock` through Docker

If you do not want to install the correct Python version and/or `poetry` on your host
machine, you can update `pyproject.toml` and `poetry.lock` through `docker`.
As an example, if you wanted to add the Python package `httpx`:

```bash
# Start container. This assumes you have previously ran docker-compose
CONTAINER_ID=$(docker run --detach --env WEBVIZ_CLIENT_SECRET=0 webviz_backend)
# Copy pyproject.toml and poetry.lock from host to container in case they have changed since it was built:
docker cp ./backend/pyproject.toml $CONTAINER_ID:/home/appuser/backend/
docker cp ./backend/poetry.lock $CONTAINER_ID:/home/appuser/backend/
# Run your poetry commands:
docker exec -it $CONTAINER_ID sh -c "poetry add httpx"
# Copy updated pyproject.toml and poetry.lock from container back to host:
docker cp $CONTAINER_ID:/home/appuser/backend/pyproject.toml ./backend/
docker cp $CONTAINER_ID:/home/appuser/backend/poetry.lock ./backend/
# Stop container
docker stop $CONTAINER_ID
```
