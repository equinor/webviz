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
with the following variables:
```
WEBVIZ_TENANT_ID=...
WEBVIZ_CLIENT_ID=...
WEBVIZ_CLIENT_SECRET=...
WEBVIZ_SUMO_RESOURCE_SCOPE=...
WEBVIZ_SMDA_RESOURCE_SCOPE=...
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
