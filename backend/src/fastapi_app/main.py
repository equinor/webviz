import datetime

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.routing import APIRoute, Request
from starsessions import InMemoryStore, SessionMiddleware, load_session
from starsessions.stores.redis import RedisStore

from .routers.timeseries import router as timeseries_router
from .routers.general import router as general_router
from .auth.auth_helper import AuthHelper
from .auth.enforce_logged_in_middleware import EnforceLoggedInMiddleware
from . import config


def custom_generate_unique_id(route: APIRoute):
    print(route.tags, route.name)
    return f"{route.name}"


app = FastAPI(generate_unique_id_function=custom_generate_unique_id, root_path="/api")

app.include_router(timeseries_router, prefix="/timeseries")

authHelper = AuthHelper()
app.include_router(authHelper.router)
app.include_router(general_router)

# Add out custom middleware to enforce that user is logged in
# Also redirects to /login endpoint for some select paths
unprotected_paths = ["/logged_in_user", "/alive", "/openapi.json"]
paths_redirected_to_login = ["/", "/alive_protected"]
app.add_middleware(
    EnforceLoggedInMiddleware,
    unprotected_paths=unprotected_paths,
    paths_redirected_to_login=paths_redirected_to_login,
)

if config.SESSION_STORAGE == "redis":
    session_store = RedisStore(config.REDIS_URL)
if config.SESSION_STORAGE == "in_memory":
    session_store = InMemoryStore()

app.add_middleware(SessionMiddleware, store=session_store)


@app.get("/")
async def root():
    return f"Backend is alive at this time: {datetime.datetime.now()}"
