import datetime
import logging

from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.responses import ORJSONResponse
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from src.backend.shared_middleware import add_shared_middlewares
from src.backend.auth.auth_helper import AuthHelper
from .routers.explore import router as explore_router
from .routers.general import router as general_router
from .routers.inplace_volumetrics.router import router as inplace_volumetrics_router
from .routers.surface.router import router as surface_router
from .routers.timeseries.router import router as timeseries_router
from .routers.parameters.router import router as parameters_router
from .routers.correlations.router import router as correlations_router
from .routers.grid.router import router as grid_router
from .routers.pvt.router import router as pvt_router
from .routers.well_completion.router import router as well_completion_router
from .routers.well.router import router as well_router
from .routers.surface_polygons.router import router as surface_polygons_router

logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s %(levelname)-3s [%(name)s]: %(message)s",
    datefmt="%H:%M:%S",
)
logging.getLogger("src.services.sumo_access").setLevel(level=logging.DEBUG)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.name}"


app = FastAPI(
    generate_unique_id_function=custom_generate_unique_id,
    root_path="/api",
    default_response_class=ORJSONResponse,
)

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
app.include_router(grid_router, prefix="/grid", tags=["grid"])
app.include_router(pvt_router, prefix="/pvt", tags=["pvt"])
app.include_router(well_completion_router, prefix="/well_completion", tags=["well_completion"])
app.include_router(well_router, prefix="/well", tags=["well"])
app.include_router(surface_polygons_router, prefix="/surface_polygons", tags=["surface_polygons"])

authHelper = AuthHelper()
app.include_router(authHelper.router)
app.include_router(general_router)

add_shared_middlewares(app)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")


@app.get("/")
async def root() -> str:
    return f"Backend is alive at this time: {datetime.datetime.now()}"
