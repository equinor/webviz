import uvicorn
from api.main import app

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="localhost", port=8000, reload=True)
