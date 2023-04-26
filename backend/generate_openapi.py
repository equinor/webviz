"""This small script is used mainly by the frontend code
to auto-generate the OpenAPI schema.

See "npm run generate-api --prefix ./frontend" for usage.
"""

import os
import json
from pathlib import Path

from fastapi.openapi.utils import get_openapi

# Set dummy variable if it does not exist (e.g. in CI):
os.environ["WEBVIZ_CLIENT_SECRET"] = os.environ.get("WEBVIZ_CLIENT_SECRET", "0")

from src.fastapi_app.main import app

Path("temp_openapi.json").write_text(
    json.dumps(
        get_openapi(
            title=app.title,
            version=app.version,
            openapi_version=app.openapi_version,
            description=app.description,
            routes=app.routes,
            servers=[{"url": app.root_path}],
        )
    )
)
