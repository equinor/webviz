import datetime
import logging
import os

from fastapi import FastAPI, Request, Query
import grid_pb2

app = FastAPI()


@app.get("/")
async def root() -> str:
    return f"User session is alive at this time: {datetime.datetime.now()}"


@app.get("/grid_surface")
async def grid_surface(request: Request, sas_token: str, blob_store_base_uri: str, grid_blob_id: str):

    print("token", sas_token)
    print("base_uri", blob_store_base_uri)
    print("blob_id", grid_blob_id)

    fake_response = grid_pb2.GetGridSurfaceResponse(
        vertexArray=[],
        quadIndicesArr=[],
        sourceCellIndicesArr=[],
        gridDimensions=grid_pb2.GridDimensions(iNum=0, jNum=0, kNum=0),
        originUtm=grid_pb2.Vec3d(x=0.0, y=0.0, z=0.0),
    )
    return {
        "vertexArray": fake_response.vertexArray,
        "quadIndicesArr": fake_response.quadIndicesArr,
        "sourceCellIndicesArr": fake_response.sourceCellIndicesArr,
        "gridDimensions": {
            "iNum": fake_response.gridDimensions.iNum,
            "jNum": fake_response.gridDimensions.jNum,
            "kNum": fake_response.gridDimensions.kNum,
        },
        "originUtm": {"x": fake_response.originUtm.x, "y": fake_response.originUtm.y, "z": fake_response.originUtm.z},
    }


@app.get("/grid_parameter")
async def grid_parameter(sas_token: str, blob_store_base_uri: str, blob_id: str):

    print("token", sas_token)
    print("base_uri", blob_store_base_uri)
    print("blob_id", blob_id)
