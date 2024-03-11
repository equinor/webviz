import base64
from typing import List, Optional

import starsessions
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from .auth_helper import AuthHelper


class EnforceLoggedInMiddleware(BaseHTTPMiddleware):
    """Middleware to enforces that the user is logged in

    By default, all paths except `/login` and `/auth-callback` are protected.

    Additional paths can be left unprotected by specifying them in `unprotected_paths`

    By default all protected paths will return status code 401 if user is not logged in,
    but the `paths_redirected_to_login` can be used to specify a list of paths that
    should cause redirect to the `/login` endpoint instead.

    Note that the fact that we're deriving from BaseHTTPMiddleware seems to cause some problems discovered
    while working on exception/error handling. We should probably reimplement this middleware as pure ASGI middleware
    instead, see: https://www.starlette.io/middleware/#pure-asgi-middleware
    """

    def __init__(
        self,
        app: FastAPI,
        unprotected_paths: Optional[List[str]] = None,
        paths_redirected_to_login: Optional[List[str]] = None,
    ) -> None:
        super().__init__(app)
        self._unprotected_paths = unprotected_paths or []
        self._paths_redirected_to_login = paths_redirected_to_login or []

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        print("##################################### ensure_logged_in")

        path_to_check = request.url.path

        # Look for root_path path as specified when initializing FastAPI
        # If there is one, strip it out before comparing paths
        root_path = request.scope.get("root_path", "")
        if root_path:
            path_to_check = path_to_check.replace(root_path, "")

        print(f"##### {request.url.path=}")
        print(f"##### {root_path=}")
        print(f"##### {path_to_check=}")

        path_is_protected = True

        if path_to_check in ["/login", "/auth-callback"] + self._unprotected_paths:
            path_is_protected = False
            print(f"##### path not protected: {path_to_check=}")

        if path_is_protected:
            print(f"##### path requires login:  {path_to_check=}")
            await starsessions.load_session(request)

            authenticated_user = AuthHelper.get_authenticated_user(request)
            is_logged_in = authenticated_user is not None
            print(f"##### {is_logged_in=}")

            if not is_logged_in:
                if path_to_check in self._paths_redirected_to_login:
                    print("##### LOGGING IN USING REDIRECT")
                    target_url_b64 = base64.urlsafe_b64encode(str(request.url).encode()).decode()
                    return RedirectResponse(f"{root_path}/login?redirect_url_after_login={target_url_b64}")
                return PlainTextResponse("Not authorized yet, must log in", 401)

        response = await call_next(request)

        return response
