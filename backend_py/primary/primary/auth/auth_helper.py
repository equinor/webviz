import base64
import os
import time
from typing import List, Optional

import jwt
import msal
import starsessions
from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse
from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config
from primary.services.utils.authenticated_user import AuthenticatedUser


class AuthHelper:
    def __init__(self) -> None:
        self.router = APIRouter()
        self.router.add_api_route(path="/login", endpoint=self._login_route, methods=["GET"])
        self.router.add_api_route(
            path="/auth-callback",
            endpoint=self._authorized_callback_route,
            methods=["GET"],
        )

    async def _login_route(self, request: Request, redirect_url_after_login: Optional[str] = None) -> RedirectResponse:
        # print("######################### _login_route()")

        await starsessions.load_session(request)
        request.session.clear()

        all_scopes_list = config.GRAPH_SCOPES.copy()
        for value in config.RESOURCE_SCOPES_DICT.values():
            all_scopes_list.extend(value)

        if "CODESPACE_NAME" in os.environ:
            # Developer is using GitHub codespace, so we use the GitHub codespace port forward URL
            redirect_uri = f"https://{os.environ['CODESPACE_NAME']}-8080.app.github.dev/api/auth-callback"
            print(f"You are using GitHub codespace. Remember to allow app registration redirect URI {redirect_uri}")
        else:
            redirect_uri = str(request.url_for("_authorized_callback_route"))

        cca = _create_msal_confidential_client_app(token_cache=None)
        flow_dict = cca.initiate_auth_code_flow(scopes=all_scopes_list, redirect_uri=redirect_uri)

        request.session["flow"] = flow_dict

        # If a final redirect url was specified, store it in session storage so we can
        # redirect once we get the auth callback. Note that the redirect_url_after_login
        # query parameter is base64 encoded
        if redirect_url_after_login is not None:
            target_url_str_after_auth = base64.urlsafe_b64decode(redirect_url_after_login.encode()).decode()
            request.session["target_url_str_after_auth"] = target_url_str_after_auth

        return RedirectResponse(flow_dict["auth_uri"])

    async def _authorized_callback_route(self, request: Request) -> Response:
        # print("######################### _authorized_callback_route()")

        await starsessions.load_session(request)

        try:
            token_cache = _load_token_cache_from_session(request)
            cca = _create_msal_confidential_client_app(token_cache)

            auth_response_dict = {}
            for key, value in request.query_params.items():
                auth_response_dict[key] = value

            # Ref msal.PublicClientApplication.acquire_token_by_auth_code_flow() docs,
            # we can only get an access token for ONE resource when redeeming the
            # authorization code. Therefore, we simply get an access token for the
            # graph resource here, and leave the retrieval of access tokens for the
            # other resources (and scopes) for later. The token cache included with
            # MSAL wil help us with the magic later.
            token_dict = cca.acquire_token_by_auth_code_flow(
                request.session.get("flow", {}),
                auth_response_dict,
                scopes=config.GRAPH_SCOPES,
            )

            if "error" in token_dict:
                # print("!!!!! Error validating redirected auth response")
                # print(f"!!!!! {token_dict=}")
                return Response(
                    f"Error validating redirected auth response, error: {token_dict['error']}",
                    400,
                )

            _save_token_cache_in_session(request, token_cache)

        except ValueError:
            # Usually caused by CSRF
            # print("!!!!! Hit an exception, probably CSRF error")
            # print(f"!!!!! exception: {err}")
            return Response("Error processing auth response, probably CSRF error", 400)

        target_url_str_after_auth = request.session.get("target_url_str_after_auth")
        if target_url_str_after_auth is not None:
            return RedirectResponse(target_url_str_after_auth)

        return Response("Login OK")

    @staticmethod
    def get_authenticated_user(
        request_with_session: Request,
    ) -> Optional[AuthenticatedUser]:
        timer = PerfTimer()

        # We may already have created and stored the AuthenticatedUser object on the request
        try:
            maybe_authenticated_user_obj = request_with_session.state.authenticated_user_obj
            if maybe_authenticated_user_obj and isinstance(maybe_authenticated_user_obj, AuthenticatedUser):
                # print("Found an authenticated user on the request object")
                return maybe_authenticated_user_obj
        except:  # nosec # pylint: disable=bare-except
            pass

        if not starsessions.is_loaded(request_with_session):
            raise ValueError("Session data has not been loaded for this request")

        token_cache = _load_token_cache_from_session(request_with_session)
        if not token_cache:
            return None

        # print(f"  load token cache {timer.lap_ms():.1f}ms")

        cca = _create_msal_confidential_client_app(token_cache)
        # print(f"  create app {timer.lap_ms():.1f}ms")
        accounts = cca.get_accounts()
        if not accounts:
            return None

        # print(f"  get accounts {timer.lap_ms():.1f}ms")

        # Try and get the current claims for the ID token from session storage
        # id_token_claims = request_with_session.session.get("logged_in_user_id_token_claims")
        # if not id_token_claims:
        #     return None

        id_token_claims = request_with_session.session.get("logged_in_user_id_token_claims", {})

        expiration_time = id_token_claims.get("exp", 0)
        if time.time() > expiration_time - 60:
            # It seems we can get a new ID token by passing in our application/client ID
            token_dict = cca.acquire_token_silent(scopes=[config.CLIENT_ID], account=accounts[0])

            # print("..................")
            # decoded_id_token = _decode_jwt(token_dict["id_token"])
            # print(f"{decoded_id_token=}")
            # print(f"{token_dict['id_token_claims']=}")
            # print("..................")

            id_token_claims = token_dict.get("id_token_claims") if token_dict else None
            request_with_session.session["logged_in_user_id_token_claims"] = id_token_claims
            if not id_token_claims:
                return None

        timer.lap_ms()

        token_dict = cca.acquire_token_silent(scopes=config.RESOURCE_SCOPES_DICT["sumo"], account=accounts[0])
        # print("---------------------SUMO------------------------")
        # print(token_dict)
        # print("------")
        # print(_decode_jwt(token_dict["access_token"]))
        # print("-------------------------------------------------")
        sumo_token = token_dict.get("access_token") if token_dict else None

        smda_token = None
        if config.RESOURCE_SCOPES_DICT.get("smda"):
            token_dict = cca.acquire_token_silent(scopes=config.RESOURCE_SCOPES_DICT["smda"], account=accounts[0])
            # print("---------------------SMDA------------------------")
            # print(token_dict)
            # print("------")
            # print(_decode_jwt(token_dict["access_token"]))
            # print("-------------------------------------------------")
            smda_token = token_dict.get("access_token") if token_dict else None

        token_dict = cca.acquire_token_silent(scopes=config.GRAPH_SCOPES, account=accounts[0])
        graph_token = token_dict.get("access_token") if token_dict else None

        # print(f"  get tokens {timer.lap_ms():.1f}ms")

        _save_token_cache_in_session(request_with_session, token_cache)

        # print(f"  save cache {timer.lap_ms():.1f}ms")

        # Could use either 'oid' or 'sub' here, but 'sub' is probably good enough, and it doesn't require
        # the profile scope (in case it matters). See this page for more info:
        # https://learn.microsoft.com/en-us/azure/active-directory/develop/id-tokens
        user_id = id_token_claims.get("sub")
        user_name = id_token_claims.get("preferred_username")
        authenticated_user = AuthenticatedUser(
            user_id=user_id,
            username=user_name,
            access_tokens={
                "graph_access_token": graph_token,
                "sumo_access_token": sumo_token,
                "smda_access_token": smda_token,
            },
        )

        request_with_session.state.authenticated_user_obj = authenticated_user

        # print(f"get_authenticated_user() took {timer.elapsed_s():.2f}s")

        return authenticated_user


def _create_msal_confidential_client_app(
    token_cache: msal.TokenCache,
) -> msal.ConfidentialClientApplication:
    authority = f"https://login.microsoftonline.com/{config.TENANT_ID}"
    return msal.ConfidentialClientApplication(
        client_id=config.CLIENT_ID,
        client_credential=config.CLIENT_SECRET,
        authority=authority,
        token_cache=token_cache,
        instance_discovery=False,
    )


# Note that this function will NOT return the token itself, but rather a dict
# that typically has an "access_token" key
def _get_token_dict_from_session_token_cache(request_with_session: Request, scopes: List[str]) -> Optional[dict]:
    token_cache = _load_token_cache_from_session(request_with_session)
    cca = _create_msal_confidential_client_app(token_cache)

    accounts = cca.get_accounts()
    if accounts:
        # So all account(s) belong to the current signed-in user
        result = cca.acquire_token_silent(scopes=scopes, account=accounts[0])
        _save_token_cache_in_session(request_with_session, token_cache)
        return result

    return None


def _load_token_cache_from_session(
    request_with_session: Request,
) -> msal.SerializableTokenCache:
    token_cache = msal.SerializableTokenCache()

    serialized_token_cache = request_with_session.session.get("token_cache")
    if serialized_token_cache:
        token_cache.deserialize(serialized_token_cache)
    return token_cache


def _save_token_cache_in_session(request_with_session: Request, token_cache: msal.SerializableTokenCache) -> None:
    if token_cache.has_state_changed:
        request_with_session.session["token_cache"] = token_cache.serialize()


def _decode_jwt(jwt_str: str) -> dict:
    return jwt.decode(jwt_str, algorithms=["RS256"], options={"verify_signature": False})
