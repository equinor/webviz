# Update `poetry.lock` through Docker

If you do not want to install the correct Python version and/or `poetry` on your host
machine, you can update `pyproject.toml` and `poetry.lock` through `docker`.
As an example, if you wanted to add the Python package `httpx`:

```bash
# Start container. This assumes you have previously ran docker-compose
CONTAINER_ID=$(docker run --detach --env WEBVIZ_CLIENT_SECRET=0 --env UVICORN_ENTRYPOINT=src.backend.primary.main:app webviz_backend-primary)
# Copy pyproject.toml and poetry.lock from host to container in case they have changed since it was built:
docker cp ./pyproject.toml $CONTAINER_ID:/home/appuser/backend/
docker cp ./poetry.lock $CONTAINER_ID:/home/appuser/backend/
docker exec -u root -it $CONTAINER_ID chown appuser:appuser /home/appuser/backend/{pyproject.toml,poetry.lock}
# Run your poetry commands:
docker exec -it $CONTAINER_ID sh -c "poetry add httpx"
# Copy updated pyproject.toml and poetry.lock from container back to host:
docker cp $CONTAINER_ID:/home/appuser/backend/pyproject.toml .
docker cp $CONTAINER_ID:/home/appuser/backend/poetry.lock .
# Stop container
docker stop $CONTAINER_ID
```


# Cache data in memory

Sometimes large data sets must be loaded from external sources. If the user interacts
with this data through a series of requests to the backend, it is inefficient to load
the same data every time. Instead the recommended pattern is to load these large data sets
using a separate job container instance bound to the user where it can then easily be cached.

Technically this is done like this:
1) The frontend makes a request to the (primary) backend as usual.
2) The "data demanding endpoints" in the primary backend proxies the request to a separate
   job container running its own server (also using `FastAPI` as framework).
3) If the user does not already have a job container bound to her/his user ID, the
   cloud infrastructure will spin it up (takes some seconds). The job container will
   have single-user scope and automatically stop when it has not seen any new requests
   for some time. Since the job container has lifetime and scope of a user session,
   the Python code can keep large data sets in memory for its lifetime and be sure
   it is always the same user accessing it.

Locally during development (single user scenario) there is a single job container
continuously running, started automatically by `docker-compose`.
Except for starting at the same time as the primary backend, not stopping after user
inactivity, and being limited by the developer machine resources (CPU / memory),
this job container during development behave similar to the on demand started job containers in cloud.

At the route level this is implemented like the following:

**In `src/backend/primary`:**
```python
from fastapi import Depends, Request

from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper
from src.backend.primary.user_session_proxy import proxy_to_user_session

...

@router.get("/some_endpoint")
async def my_function(
    request: Request,
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    return await proxy_to_user_session(request, authenticated_user)
```

**In `src/backend/user_session:**
```python
from functools import lru_cache

from fastapi import Depends

from src.services.utils.authenticated_user import AuthenticatedUser
from src.backend.auth.auth_helper import AuthHelper

...

@router.get("/some_endpoint")
async def my_function(
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
):
    return {"data": load_some_large_data_set(authenticated_user)}

@lru_cache
def load_some_large_data_set(authenticated_user):
    ...
```

The endpoint should have the same path as shown here
in both primary backend and the job backend.
