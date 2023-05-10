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
