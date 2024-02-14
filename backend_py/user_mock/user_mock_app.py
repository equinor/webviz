import datetime

from fastapi import FastAPI


app = FastAPI()


@app.get("/")
async def root() -> str:
    ret_str = f"user-mock is alive at this time: {datetime.datetime.now()}"
    print("Sending: ", ret_str)
    return ret_str


