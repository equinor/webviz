import base64
import logging
from typing import List, Optional

import starsessions
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.requests import Request
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from .auth_helper import AuthHelper

LOGGER = logging.getLogger(__name__)


class EnforceLoggedInMiddleware:
    """
    Pure ASGI middleware to enforce that the user is logged in

    By default, all paths except `/login` and `/auth-callback` are protected.

    Additional paths can be left unprotected by specifying them in `unprotected_paths`

    By default all protected paths will return status code 401 if user is not logged in,
    but the `paths_redirected_to_login` can be used to specify a list of paths that
    should cause redirect to the `/login` endpoint instead.
    """

    def __init__(
        self,
        app: ASGIApp,
        unprotected_paths: List[str] | None = None,
        paths_redirected_to_login: List[str] | None = None,
    ):
        self._app = app
        self._unprotected_paths = unprotected_paths or []
        self._paths_redirected_to_login = paths_redirected_to_login or []

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self._app(scope, receive, send)

        perf_metrics = PerfMetrics()

        path_to_check = scope.get("path", "")
        root_path = scope.get("root_path", "")
        if root_path:
            path_to_check = path_to_check.replace(root_path, "")

        path_is_protected = True
        if path_to_check in ["/login", "/auth-callback"] + self._unprotected_paths:
            path_is_protected = False

        if path_is_protected:
            request = Request(scope, receive)

            await starsessions.load_session(request)
            perf_metrics.record_lap("load-session")

            authenticated_user = AuthHelper.get_authenticated_user(request)
            perf_metrics.record_lap("get-auth-user")

            is_logged_in = authenticated_user is not None

            LOGGER.debug(
                f"EnforceLoggedInMiddleware for protected path ({path_to_check=}, {is_logged_in=}) took: {perf_metrics.to_string()}"
            )

            if not is_logged_in:
                if path_to_check in self._paths_redirected_to_login:
                    LOGGER.info("EnforceLoggedInMiddleware - redirecting to login page")
                    target_url_b64 = base64.urlsafe_b64encode(str(request.url).encode()).decode()
                    redirect_response = RedirectResponse(f"{root_path}/login?redirect_url_after_login={target_url_b64}")
                    await redirect_response(scope, receive, send)
                    return

                LOGGER.info("EnforceLoggedInMiddleware - user is not authorized yet")
                text_response = PlainTextResponse("Not authorized yet, must log in", 401)
                await text_response(scope, receive, send)
                return
        else:
            LOGGER.debug(
                f"EnforceLoggedInMiddleware for UNPROTECTED path ({path_to_check=}) took: {perf_metrics.to_string()}"
            )

        await self._app(scope, receive, send)


# To be removed once we have proper traction on the new ASGI-based middleware above
class DeprecatedEnforceLoggedInMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce that the user is logged in

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
        perf_metrics = PerfMetrics()

        path_to_check = request.url.path

        # Look for root_path path as specified when initializing FastAPI
        # If there is one, strip it out before comparing paths
        root_path = request.scope.get("root_path", "")
        if root_path:
            path_to_check = path_to_check.replace(root_path, "")

        path_is_protected = True

        for unprotected in ["/login", "/auth-callback"] + self._unprotected_paths:
            if path_to_check.startswith(unprotected):
                path_is_protected = False
                break

        if path_is_protected:

            await starsessions.load_session(request)
            perf_metrics.record_lap("load-session")

            authenticated_user = AuthHelper.get_authenticated_user(request)
            is_logged_in = authenticated_user is not None

            perf_metrics.record_lap("get-auth-user")
            # LOGGER.debug(f"EnforceLoggedInMiddleware() dispatch took took: {perf_metrics.to_string()}")

            if not is_logged_in:
                if path_to_check in self._paths_redirected_to_login:
                    target_url_b64 = base64.urlsafe_b64encode(str(request.url).encode()).decode()
                    return RedirectResponse(f"{root_path}/login?redirect_url_after_login={target_url_b64}")
                return PlainTextResponse("Not authorized yet, must log in", 401)

        response = await call_next(request)

        return response
