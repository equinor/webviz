import base64
from typing import Mapping
from urllib.parse import urljoin

# Using the same http client as sumo
import httpx


class GraphApiAccess:
    def __init__(self, access_token: str):
        self._access_token = access_token
        self.base_url = "https://graph.microsoft.com/v1.0/"

    def _make_headers(self) -> Mapping[str, str]:
        return {"Authorization": f"Bearer {self._access_token}"}

    async def _request(self, url: str) -> httpx.Response:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers=self._make_headers(),
            )
            return response

    async def get_user_profile_photo(self, user_id: str) -> str | None:
        request_url = urljoin(self.base_url, "me/photo/$value" if user_id == "me" else f"users/{user_id}/photo/$value")

        response = await self._request(request_url)

        if response.status_code == 200:
            return base64.b64encode(response.content).decode("utf-8")
        else:
            return None

    async def get_user_info(self, user_id: str) -> Mapping[str, str] | None:
        request_url = urljoin(self.base_url, "me" if user_id == "me" else f"users/{user_id}")

        response = await self._request(request_url)

        if response.status_code == 200:
            return response.json()
        else:
            return None
