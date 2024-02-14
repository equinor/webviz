import datetime
import os

from fastapi import FastAPI


RADIX_JOB_NAME = os.getenv("RADIX_JOB_NAME")
print(f"{RADIX_JOB_NAME=}")

RADIX_APP = os.getenv("RADIX_APP")
print(f"{RADIX_APP=}")

RADIX_ENVIRONMENT = os.getenv("RADIX_ENVIRONMENT")
print(f"{RADIX_ENVIRONMENT=}")

RADIX_COMPONENT = os.getenv("RADIX_COMPONENT")
print(f"{RADIX_COMPONENT=}")



app = FastAPI()

@app.get("/")
async def root() -> str:
    ret_str = f"user-mock is alive at this time: {datetime.datetime.now()}  [RADIX_JOB_NAME={RADIX_JOB_NAME}]  [RADIX_APP={RADIX_APP}]  [RADIX_ENVIRONMENT={RADIX_ENVIRONMENT}]  [RADIX_COMPONENT={RADIX_COMPONENT}"
    print("Sending: ", ret_str)
    return ret_str


