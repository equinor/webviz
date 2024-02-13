import datetime
import logging
import os

from fastapi import FastAPI, Request, Query
import grid_pb2
import httpx
import tempfile

app = FastAPI()


@app.get("/")
async def root() -> str:
    return f"User session is alive at this time: {datetime.datetime.now()}"


@app.get("/grid_surface")
async def grid_surface(request: Request, sas_token: str, blob_store_base_uri: str, grid_blob_id: str):

    print("token", sas_token)
    print("base_uri", blob_store_base_uri)
    print("blob_id", grid_blob_id)
    tmp_file_name = await download_blob_to_tempfile(blob_store_base_uri, grid_blob_id, sas_token)
    print(tmp_file_name)
    print(f"Size of grid file. {os.path.getsize(tmp_file_name)}")
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


async def download_blob_to_tempfile(blob_store_base_uri, blob_id, sas_token):
    async with httpx.AsyncClient() as client:
        response = await client.get(url=f"{blob_store_base_uri}/{blob_id}?{sas_token}")
        response.raise_for_status()  # Ensure we got a successful response

        # Create a temporary file to store the download
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            # Write the content of the response to the temporary file
            tmp_file.write(response.content)
            print(f"Blob downloaded to {tmp_file.name}")
            # Return the path to the temporary file for further use
            return tmp_file.name
