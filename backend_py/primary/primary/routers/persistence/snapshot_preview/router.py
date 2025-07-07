import html
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse

from primary.services.database_access.snapshot_access.snapshot_access import SnapshotAccess

router = APIRouter()


@router.get("/{snapshot_id}", response_class=HTMLResponse)
async def snapshot_preview(snapshot_id: str, request: Request):
    access = await SnapshotAccess.create("")
    async with access:
        metadata = await access.get_snapshot_metadata(snapshot_id)
        if not metadata:
            raise HTTPException(status_code=404, detail="Snapshot metadata not found")

        base_url = get_external_base_url(request)
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


def get_external_base_url(request: Request) -> str:
    forwarded_proto = request.headers.get("x-forwarded-proto", "http")
    forwarded_host = request.headers.get("x-forwarded-host", request.headers.get("host", "localhost"))
    return f"{forwarded_proto}://{forwarded_host}"
