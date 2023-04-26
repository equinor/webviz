import datetime
import logging

from fastapi import FastAPI
from fastapi.routing import APIRoute
from starsessions import SessionMiddleware
from starsessions.stores.redis import RedisStore
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from . import config
from .auth.auth_helper import AuthHelper
from .auth.enforce_logged_in_middleware import EnforceLoggedInMiddleware
from .routers.explore import router as explore_router
from .routers.general import router as general_router
from .routers.inplace_volumetrics.router import router as inplace_volumetrics_router
from .routers.surface.router import router as surface_router
from .routers.timeseries.router import router as timeseries_router
from .routers.parameters.router import router as parameters_router
from .routers.correlations.router import router as correlations_router

logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s %(levelname)-3s [%(name)s]: %(message)s",
    datefmt="%H:%M:%S",
)
logging.getLogger("src.services.sumo_access").setLevel(level=logging.DEBUG)


def custom_generate_unique_id(route: APIRoute):
    return f"{route.name}"


app = FastAPI(generate_unique_id_function=custom_generate_unique_id, root_path="/api")

# The tags we add here will determine the name of the frontend api service for our endpoints as well as
# providing some grouping when viewing the openapi documentation.
app.include_router(explore_router, tags=["explore"])
app.include_router(timeseries_router, prefix="/timeseries", tags=["timeseries"])
app.include_router(
    inplace_volumetrics_router,
    prefix="/inplace_volumetrics",
    tags=["inplace_volumetrics"],
)
app.include_router(surface_router, prefix="/surface", tags=["surface"])
app.include_router(parameters_router, prefix="/parameters", tags=["parameters"])
app.include_router(correlations_router, prefix="/correlations", tags=["correlations"])

authHelper = AuthHelper()
app.include_router(authHelper.router)
app.include_router(general_router)

# Add out custom middleware to enforce that user is logged in
# Also redirects to /login endpoint for some select paths
unprotected_paths = ["/logged_in_user", "/alive", "/openapi.json"]
paths_redirected_to_login = ["/", "/alive_protected"]
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
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
