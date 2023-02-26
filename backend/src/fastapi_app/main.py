import datetime

from fastapi import FastAPI
from fastapi.routing import APIRoute
from starsessions import SessionMiddleware
from starsessions.stores.redis import RedisStore

from .routers.explore import router as explore_router
from .routers.timeseries.router import router as timeseries_router
from .routers.general import router as general_router
from .auth.auth_helper import AuthHelper
from .auth.enforce_logged_in_middleware import EnforceLoggedInMiddleware
from . import config


def custom_generate_unique_id(route: APIRoute):
    return f"{route.name}"


app = FastAPI(generate_unique_id_function=custom_generate_unique_id, root_path="/api")

app.include_router(explore_router)
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

session_store = RedisStore(config.REDIS_URL)

app.add_middleware(SessionMiddleware, store=session_store)


@app.get("/")
async def root():
    return f"Backend is alive at this time: {datetime.datetime.now()}"
