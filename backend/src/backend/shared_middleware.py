from fastapi import FastAPI
from starsessions import SessionMiddleware
from starsessions.stores.redis import RedisStore

from src import config
from src.backend.auth.enforce_logged_in_middleware import EnforceLoggedInMiddleware


def add_shared_middlewares(app: FastAPI) -> None:
    # Add out custom middleware to enforce that user is logged in
    # Also redirects to /login endpoint for some select paths
    unprotected_paths = ["/logged_in_user", "/alive", "/openapi.json"]
    paths_redirected_to_login = ["/", "/alive_protected"]
    app.add_middleware(
        EnforceLoggedInMiddleware,
        unprotected_paths=unprotected_paths,
        paths_redirected_to_login=paths_redirected_to_login,
    )

    session_store = RedisStore(config.REDIS_USER_SESSION_URL, prefix="user-auth:")
    app.add_middleware(SessionMiddleware, store=session_store)
