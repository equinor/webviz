import datetime
import logging
import os

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from fastapi.routing import APIRoute
from starsessions import SessionMiddleware
from starsessions.stores.redis import RedisStore
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from primary.auth.auth_helper import AuthHelper
from primary.auth.enforce_logged_in_middleware import EnforceLoggedInMiddleware
from primary.middleware.add_process_time_to_server_timing_middleware import AddProcessTimeToServerTimingMiddleware
from primary.routers.correlations.router import router as correlations_router
from primary.routers.dev.router import router as dev_router
from primary.routers.explore.router import router as explore_router
from primary.routers.general import router as general_router
from primary.routers.graph.router import router as graph_router
from primary.routers.grid3d.router import router as grid3d_router
from primary.routers.group_tree.router import router as group_tree_router
from primary.routers.inplace_volumetrics.router import router as inplace_volumetrics_router
from primary.routers.observations.router import router as observations_router
from primary.routers.parameters.router import router as parameters_router
from primary.routers.polygons.router import router as polygons_router
from primary.routers.pvt.router import router as pvt_router
from primary.routers.rft.router import router as rft_router
from primary.routers.seismic.router import router as seismic_router
from primary.routers.surface.router import router as surface_router
from primary.routers.timeseries.router import router as timeseries_router
from primary.routers.well.router import router as well_router
from primary.routers.well_completions.router import router as well_completions_router
from primary.utils.azure_monitor_setup import setup_azure_monitor_telemetry
from primary.utils.exception_handlers import configure_service_level_exception_handlers
from primary.utils.exception_handlers import override_default_fastapi_exception_handlers
from primary.utils.logging_setup import ensure_console_log_handler_is_configured, setup_normal_log_levels

from . import config


ensure_console_log_handler_is_configured()
setup_normal_log_levels()

# temporarily set some loggers to DEBUG
# logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger("primary.services.sumo_access").setLevel(logging.DEBUG)
logging.getLogger("primary.services.user_session_manager").setLevel(logging.DEBUG)
logging.getLogger("primary.services.user_grid3d_service").setLevel(logging.DEBUG)
logging.getLogger("primary.routers.grid3d").setLevel(logging.DEBUG)
logging.getLogger("primary.routers.dev").setLevel(logging.DEBUG)

LOGGER = logging.getLogger(__name__)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.name}"


app = FastAPI(
    generate_unique_id_function=custom_generate_unique_id,
    root_path="/api",
    default_response_class=ORJSONResponse,
)

if os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING"):
    LOGGER.info("Configuring Azure Monitor telemetry for primary backend")
    setup_azure_monitor_telemetry(app)
else:
    LOGGER.warning("Skipping telemetry configuration, APPLICATIONINSIGHTS_CONNECTION_STRING env variable not set.")


# The tags we add here will determine the name of the frontend api service for our endpoints as well as
# providing some grouping when viewing the openapi documentation.
app.include_router(explore_router, tags=["explore"])
app.include_router(timeseries_router, prefix="/timeseries", tags=["timeseries"])
app.include_router(inplace_volumetrics_router, prefix="/inplace_volumetrics", tags=["inplace_volumetrics"])
app.include_router(surface_router, prefix="/surface", tags=["surface"])
app.include_router(parameters_router, prefix="/parameters", tags=["parameters"])
app.include_router(correlations_router, prefix="/correlations", tags=["correlations"])
app.include_router(grid3d_router, prefix="/grid3d", tags=["grid3d"])
app.include_router(group_tree_router, prefix="/group_tree", tags=["group_tree"])
app.include_router(pvt_router, prefix="/pvt", tags=["pvt"])
app.include_router(well_completions_router, prefix="/well_completions", tags=["well_completions"])
app.include_router(well_router, prefix="/well", tags=["well"])
app.include_router(seismic_router, prefix="/seismic", tags=["seismic"])
app.include_router(polygons_router, prefix="/polygons", tags=["polygons"])
app.include_router(graph_router, prefix="/graph", tags=["graph"])
app.include_router(observations_router, prefix="/observations", tags=["observations"])
app.include_router(rft_router, prefix="/rft", tags=["rft"])
app.include_router(dev_router, prefix="/dev", tags=["dev"], include_in_schema=False)

auth_helper = AuthHelper()
app.include_router(auth_helper.router)
app.include_router(general_router)

configure_service_level_exception_handlers(app)
override_default_fastapi_exception_handlers(app)


# This middleware instance approximately measures execution time of the route handler itself
app.add_middleware(AddProcessTimeToServerTimingMiddleware, metric_name="total-exec-route")

# Add out custom middleware to enforce that user is logged in
# Also redirects to /login endpoint for some select paths
unprotected_paths = ["/logged_in_user", "/alive", "/openapi.json"]
paths_redirected_to_login = ["/", "/alive_protected"]
app.add_middleware(
    EnforceLoggedInMiddleware,
    unprotected_paths=unprotected_paths,
    paths_redirected_to_login=paths_redirected_to_login,
)

session_store = RedisStore(config.REDIS_USER_SESSION_URL, prefix="user-auth:")
app.add_middleware(SessionMiddleware, store=session_store)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# This middleware instance measures execution time of the endpoints, including the cost of other middleware
app.add_middleware(AddProcessTimeToServerTimingMiddleware, metric_name="total")


@app.get("/")
async def root() -> str:
    return f"Primary backend is alive at this time: {datetime.datetime.now()}"
