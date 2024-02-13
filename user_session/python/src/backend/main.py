import datetime
import logging
import os

from fastapi import FastAPI, Request, Query
app = FastAPI()



@app.get("/")
async def root() -> str:
    return f"User session is alive at this time: {datetime.datetime.now()}"




@app.get("/grid_surface")
async def grid_surface(
    request:Request,
    sas_token: str,
    blob_store_base_uri: str,
    grid_blob_id: str
):

    print("token",sas_token)
    print("base_uri",blob_store_base_uri)
    print("blob_id",grid_blob_id)
    return ""

@app.get("/grid_parameter")
async def grid_parameter(
    sas_token: str,
    blob_store_base_uri: str,
    blob_id: str
):

    print("token",sas_token)
    print("base_uri",blob_store_base_uri)
    print("blob_id",blob_id)