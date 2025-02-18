import base64
import os
import time
from typing import List, Optional, TypedDict
import logging

import jwt
import msal
import starsessions
from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse
from webviz_pkg.core_utils.perf_timer import PerfTimer

from primary import config
from primary.services.utils.authenticated_user import AuthenticatedUser
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from pydantic import BaseModel
from typing import Literal


LOGGER = logging.getLogger(__name__)



class _TokenEntry(BaseModel):
    token: str
    expires_at: int # Unix timestamp, seconds since epoch UTC 

class _UserAuthInfo(BaseModel):
    user_id: str
    user_name: str
    user_identity_expires_at: int # Unix timestamp when the user identity above (extracted from ID token) expires
    access_tokens: dict[Literal["sumo"], _TokenEntry]
    earliest_expiry_time: int # Earliest expiry time for the user info and of all tokens


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
    def get_authenticated_user(request_with_session: Request) -> Optional[AuthenticatedUser]:
        perf_metrics = PerfMetrics()

        # We may already have created and stored the AuthenticatedUser object in the request's state
        # one a previous call to this function. If so, we can just return it.
        try:
            maybe_authenticated_user_obj = request_with_session.state.authenticated_user_obj
            if maybe_authenticated_user_obj and isinstance(maybe_authenticated_user_obj, AuthenticatedUser):
                LOGGER.debug("Found an authenticated user on the request object")
                return maybe_authenticated_user_obj
        except:  # nosec # pylint: disable=bare-except
            pass

        if not starsessions.is_loaded(request_with_session):
            raise ValueError("Session data has not been loaded for this request")


        """
        user_auth_data_from_session: _UserAuthData = request_with_session.session.get("user_auth_data")
        if user_auth_data_from_session:
            authenticated_user = AuthenticatedUser(
                user_id=user_auth_data_from_session.get("user_id"),
                username=user_auth_data_from_session.get("username"),
                access_tokens={
                    "graph_access_token": user_auth_data_from_session.get("access_tokens", {}).get("graph"),
                    "sumo_access_token": user_auth_data_from_session.get("access_tokens", {}).get("sumo"),
                    "smda_access_token": user_auth_data_from_session.get("access_tokens", {}).get("smda"),
                    "ssdl_access_token": user_auth_data_from_session.get("access_tokens", {}).get("ssdl"),
                },
            )
            # request_with_session.state.authenticated_user_obj = authenticated_user
            # LOGGER.debug(f"get_authenticated_user() - got it from session took: {perf_metrics.to_string()}")
            # return authenticated_user
        """

        token_cache = _load_token_cache_from_session(request_with_session)
        if not token_cache:
            return None
        perf_metrics.record_lap("load-token-cache")

        cca = _create_msal_confidential_client_app(token_cache)
        perf_metrics.record_lap("create-cca")

        accounts = cca.get_accounts()
        if not accounts:
            return None
        perf_metrics.record_lap("get-accounts")

        # Try and get the current claims for the ID token from session storage
        # id_token_claims = request_with_session.session.get("logged_in_user_id_token_claims")
        # if not id_token_claims:
        #     return None

        id_token_claims = request_with_session.session.get("logged_in_user_id_token_claims", {})

        expiration_time = id_token_claims.get("exp", 0) if id_token_claims else 0
        if time.time() > expiration_time - 60:
            # It seems we can get a new ID token by passing in our application/client ID
            # token_dict = cca.acquire_token_silent(scopes=[config.CLIENT_ID], account=accounts[0], force_refresh=True)
            token_dict = cca.acquire_token_silent(scopes=["User.Read"], account=accounts[0], force_refresh=True)

            id_token = token_dict.get("id_token") if token_dict else None
            id_token_claims = token_dict.get("id_token_claims") if token_dict else None
            request_with_session.session["logged_in_user_id_token_claims"] = id_token_claims
            if not id_token_claims:
                return None

        perf_metrics.reset_lap_timer()

        token_dict = cca.acquire_token_silent(scopes=config.RESOURCE_SCOPES_DICT["sumo"], account=accounts[0])
        sumo_token = token_dict.get("access_token") if token_dict else None

        smda_token = None
        if config.RESOURCE_SCOPES_DICT.get("smda"):
            token_dict = cca.acquire_token_silent(scopes=config.RESOURCE_SCOPES_DICT["smda"], account=accounts[0])
            smda_token = token_dict.get("access_token") if token_dict else None

        ssdl_token = None
        if config.RESOURCE_SCOPES_DICT.get("ssdl"):
            token_dict = cca.acquire_token_silent(scopes=config.RESOURCE_SCOPES_DICT["ssdl"], account=accounts[0])
            ssdl_token = token_dict.get("access_token") if token_dict else None

        token_dict = cca.acquire_token_silent(scopes=config.GRAPH_SCOPES, account=accounts[0], force_refresh=True)
        graph_token = token_dict.get("access_token") if token_dict else None
        id_token = token_dict.get("id_token") if token_dict else None
        LOGGER.debug("-------------------------")
        LOGGER.debug("GRAPH TOKEN")
        LOGGER.debug(_decode_jwt(graph_token))
        LOGGER.debug("-------------------------")

        perf_metrics.record_lap("get-tokens")

        # ------------------------------------------------

        new_user_auth_data = _acquire_refreshed_identity_and_tokens(token_cache, None)
        new_user_auth_data = _acquire_refreshed_identity_and_tokens(token_cache, new_user_auth_data)

        perf_metrics.record_lap("acquire-all-tokens")

        request_with_session.session["user_auth_data"] = new_user_auth_data.model_dump_json()
        perf_metrics.record_lap("save-user-auth-data")

        # ------------------------------------------------

        _save_token_cache_in_session(request_with_session, token_cache)
        perf_metrics.record_lap("save-token-cache")



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
                "ssdl_access_token": ssdl_token,
            },
        )

        # Attach the newly created AuthenticatedUser object to the request's state so that we can avoid going to the
        # session store if this function is called multiple times during the processing of a single request.
        request_with_session.state.authenticated_user_obj = authenticated_user

        LOGGER.debug(f"get_authenticated_user() took: {perf_metrics.to_string()}")

        return authenticated_user


def _acquire_access_token_for_resource_scopes(cca: msal.ConfidentialClientApplication, resource_name: Literal["graph", "sumo", "smda" "ssdl"], account: str) -> _TokenEntry | None:
    scopes_list: list[str] | None = None
    if resource_name == "graph":
        scopes_list = config.GRAPH_SCOPES
    else:
        scopes_list = config.RESOURCE_SCOPES_DICT.get(resource_name)

    if not scopes_list:
        return None

    token_dict = cca.acquire_token_silent(scopes=scopes_list, account=account)
    access_token = token_dict.get("access_token") if token_dict else None
    if not access_token:
        return None

    # Should we be validating the tokens here?
    jwt_payload_dict = _decode_jwt(access_token)
    try:
        expires_at = int(jwt_payload_dict["exp"])
    except ValueError:
        LOGGER.error(f"Error getting expiration time claim (exp) from access token ({resource_name=})")
        return None

    return _TokenEntry(token=access_token, expires_at=expires_at)


def _acquire_refreshed_identity_and_tokens(token_cache: msal.TokenCache, curr_auth_info: _UserAuthInfo | None) -> _UserAuthInfo | None:
    """
    This function will return up to date information on the user's identity as well as valid access tokens.
    
    The existing auth info is passed in so that we can determine if it is necessary to request a new ID token to validate the
    user's identity. We could do the same for the access tokens, but here the msal token cache does the heavy lifting for us,
    so it is probably easier just to acquire them all.
    """
    perf_metrics = PerfMetrics()

    cca = _create_msal_confidential_client_app(token_cache)
    perf_metrics.record_lap("create-cca")

    account_list = cca.get_accounts()
    if not account_list:
        LOGGER.error("Error getting accunts")
        return None
    account = account_list[0]
    perf_metrics.record_lap("get-accounts")

    # It seems we cannot get a new ID token in the same way can an access token.
    # There is no direct way of asking for an ID token, but we will get a new ID token each time we get a new
    # access token for the graph scopes (or any other scopes that include the "openid" scope)
    # Therefore we will force a refresh on the graph scopes to get a new ID token.
    # This means we don't get the benefit of the msal token cache, so we try and avoid forcing a refresh
    # of the ID token unless it is getting close to expiring. 
    # Similar to msal we will consider it expired if it expires is less than 5 minutes.
    time_now = time.time()
    identity_expires_in = curr_auth_info.user_identity_expires_at - time_now if curr_auth_info else 0
    if identity_expires_in < 5*60:
        token_dict = cca.acquire_token_silent(scopes=config.GRAPH_SCOPES, account=account, force_refresh=True)
        id_token = token_dict.get("id_token") if token_dict else None
        if not id_token:
            LOGGER.error("Error acquiring ID token")
            return None

        id_token_claims_dict = _decode_jwt(id_token)
        try:
            # !!!!!
            # May want to switch to 'oid' instead since it is the unique identifier for the user across the tenant
            # !!!!
            # Could use either 'oid' or 'sub' here, but 'sub' is probably good enough, and it doesn't require
            # the profile scope (in case it matters). See this page for more info:
            # https://learn.microsoft.com/en-us/azure/active-directory/develop/id-tokens
            user_id = id_token_claims_dict["sub"]
            user_name = id_token_claims_dict["preferred_username"]
            id_token_expiry_time = int(id_token_claims_dict["exp"])
        except ValueError:
            LOGGER.error("Error getting claims from ID token")
            return None

        perf_metrics.record_lap("get-id-token")
    else:
        # Just reuse the values from the current auth info
        user_id = curr_auth_info.user_id
        user_name = curr_auth_info.user_name
        id_token_expiry_time = curr_auth_info.user_identity_expires_at

    # So we have the identity of an authenticated user
    # This is the minimum requirement for returning info on the user so we can create the new object
    # We'll then continue to populate it with access tokens
    new_auth_info = _UserAuthInfo(
        user_id=user_id,
        user_name= user_name,
        user_identity_expires_at=id_token_expiry_time,
        access_tokens={},
        earliest_expiry_time=0)

    resource_names = ["graph", "sumo", "smda", "ssdl"]
    for resource_name in resource_names:
        token_entry = _acquire_access_token_for_resource_scopes(cca, resource_name, account)
        if token_entry:
            new_auth_info.access_tokens[resource_name] = token_entry

    # Determine the earliest expiry time of all the tokens and the identity
    earliest_expiry_time = new_auth_info.user_identity_expires_at
    for token_entry in new_auth_info.access_tokens.values():
        if token_entry.expires_at < earliest_expiry_time:
            earliest_expiry_time = token_entry.expires_at

    new_auth_info.earliest_expiry_time = earliest_expiry_time

    perf_metrics.record_lap("get-access_tokens")

    LOGGER.debug(f"_acquire_all_tokens() took: {perf_metrics.to_string()}")

    return new_auth_info



def _create_msal_confidential_client_app(token_cache: msal.TokenCache) -> msal.ConfidentialClientApplication:
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


def _load_token_cache_from_session(request_with_session: Request) -> msal.SerializableTokenCache:
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
