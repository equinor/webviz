import html
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from primary.services.database_access.snapshot_access import SnapshotAccess

router = APIRouter()

@router.get("/{snapshot_id}", response_class=HTMLResponse)
async def snapshot_preview(snapshot_id: str, request: Request):
    access = await SnapshotAccess.create("")
    async with access:
        metadata = await access.get_snapshot_metadata(snapshot_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="Snapshot metadata not found")
        
        root_path = request.scope.get("root_path", "")  # "/api"
        base_url = str(request.base_url)
        if root_path and base_url.endswith(root_path + "/"):
            base_url = base_url[: -len(root_path + "/")]
            
        snapshot_url = f"{base_url}/snapshot/{snapshot_id}"

        title = html.escape(metadata.title)
        description = html.escape(metadata.description or "No description available")

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8" />
        <meta property="og:title" content="{title}" />
        <meta property="og:description" content="{description}" />
        <meta property="og:url" content="{snapshot_url}" />
        <meta property="og:type" content="website" />
        </head>
        <body>
        Redirecting… <script>window.location = "{snapshot_url}";</script>
        </body>
        </html>
        """
