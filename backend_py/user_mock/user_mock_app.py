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


def dump_env_vars():
    print(f"{RADIX_JOB_NAME=}")
    print(f"{RADIX_APP=}")
    print(f"{RADIX_ENVIRONMENT=}")
    print(f"{RADIX_COMPONENT=}")

app = FastAPI()

@app.get("/")
async def root() -> str:
    dump_env_vars()
    ret_str = f"user-mock is alive at this time: {datetime.datetime.now()}  [RADIX_JOB_NAME={RADIX_JOB_NAME}]  [RADIX_APP={RADIX_APP}]  [RADIX_ENVIRONMENT={RADIX_ENVIRONMENT}]  [RADIX_COMPONENT={RADIX_COMPONENT}"
    print("Sending: ", ret_str)
    return ret_str


@app.get("/health/live")
async def health_live() -> str:
    ret_str = f"LIVE at: {datetime.datetime.now()}"
    print(f"health_live() returning {ret_str}")
    dump_env_vars()
    return ret_str


@app.get("/health/ready")
async def health_ready() -> str:
    ret_str = f"READY at: {datetime.datetime.now()}"
    print(f"health_ready() returning {ret_str}")
    dump_env_vars()
    return ret_str


@app.get("/dowork")
async def dowork() -> str:
    ret_str = f"WORK DONE at: {datetime.datetime.now()}"
    print(f"dowork() returning {ret_str}")
    return ret_str


