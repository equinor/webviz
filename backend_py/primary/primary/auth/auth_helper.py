import base64
import logging
import os
import time
from typing import Literal, Optional, TypeAlias, get_args

import jwt
import msal
import starsessions
from fastapi import APIRouter, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ValidationError
from webviz_pkg.core_utils.perf_metrics import PerfMetrics

from primary import config
from primary.middleware.add_browser_cache import no_cache
from primary.services.utils.authenticated_user import AuthenticatedUser

LOGGER = logging.getLogger(__name__)

_ResourceName: TypeAlias = Literal["graph", "sumo", "smda", "ssdl"]


class _TokenEntry(BaseModel):
    token: str
    expires_at: int  # Unix timestamp, seconds since epoch UTC


class _UserAuthInfo(BaseModel):
    user_id: str
    user_name: str
    user_identity_expires_at: int  # Unix timestamp when the user identity above (extracted from ID token) expires
    access_tokens: dict[_ResourceName, _TokenEntry]
    earliest_expiry_time: int  # Earliest expiry time for the user info and of all tokens

    def to_authenticated_user(self) -> AuthenticatedUser:
        graph_token_entry = self.access_tokens.get("graph")
        sumo_token_entry = self.access_tokens.get("sumo")
        smda_token_entry = self.access_tokens.get("smda")
        ssdl_token_entry = self.access_tokens.get("ssdl")

        authenticated_user_obj = AuthenticatedUser(
            user_id=self.user_id,
            username=self.user_name,
            access_tokens={
                "graph_access_token": graph_token_entry.token if graph_token_entry else None,
                "sumo_access_token": sumo_token_entry.token if sumo_token_entry else None,
                "smda_access_token": smda_token_entry.token if smda_token_entry else None,
                "ssdl_access_token": ssdl_token_entry.token if ssdl_token_entry else None,
            },
        )

        return authenticated_user_obj


class AuthHelper:
    def __init__(self) -> None:
        self.router = APIRouter()
        self.router.add_api_route(path="/login", endpoint=self._login_route, methods=["GET"])
        self.router.add_api_route(path="/auth-callback", endpoint=self._authorized_callback_route, methods=["GET"])

    @no_cache
    async def _login_route(self, request: Request, redirect_url_after_login: Optional[str] = None) -> RedirectResponse:
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

    @no_cache
    async def _authorized_callback_route(self, request: Request) -> Response:
        await starsessions.load_session(request)

        try:
            token_cache = _load_token_cache_from_session(request)
            cca = _create_msal_confidential_client_app(token_cache)

            auth_response_dict = {}
            for key, value in request.query_params.items():
                auth_response_dict[key] = value

            # Ref msal.PublicClientApplication.acquire_token_by_auth_code_flow() docs, we can only get an access token
            # for ONE resource when redeeming the authorization code. Therefore, we simply get an access token for the
            # graph resource here, and leave the retrieval of access tokens for the other resources (and scopes) for later.
            token_dict = cca.acquire_token_by_auth_code_flow(
                auth_code_flow=request.session.get("flow", {}),
                auth_response=auth_response_dict,
                scopes=config.GRAPH_SCOPES,
            )

            if "error" in token_dict:
                return Response(f"Error validating redirected auth response, error: {token_dict['error']}", 400)

            _save_token_cache_in_session(request, token_cache)

        except ValueError:
            # Usually caused by CSRF
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
                LOGGER.debug("get_authenticated_user() found cached AuthenticatedUser object in request's state")
                return maybe_authenticated_user_obj
        except:  # nosec # pylint: disable=bare-except
            pass

        if not starsessions.is_loaded(request_with_session):
            raise ValueError("Session data has not been loaded for this request")

        user_auth_info_from_session: _UserAuthInfo | None = _load_user_auth_info_from_session(request_with_session)
        perf_metrics.record_lap("load-user-auth-info")
        if user_auth_info_from_session:
            first_item_expires_in = user_auth_info_from_session.earliest_expiry_time - time.time()
            if first_item_expires_in >= 5 * 60:
                authenticated_user = user_auth_info_from_session.to_authenticated_user()

                # Store/cache the AuthenticatedUser object in the request's state
                request_with_session.state.authenticated_user_obj = authenticated_user

                LOGGER.debug(
                    f"get_authenticated_user() got user auth info (valid for {first_item_expires_in:.0f}s) from session in: {perf_metrics.to_string()}"
                )
                return authenticated_user

        # We can't find a valid user auth info object in the session store, so we need to create/refresh it
        token_cache = _load_token_cache_from_session(request_with_session)
        if not token_cache:
            return None
        perf_metrics.record_lap("load-token-cache")

        new_user_auth_info: _UserAuthInfo | None = _acquire_refreshed_identity_and_tokens(
            token_cache, user_auth_info_from_session
        )
        if not new_user_auth_info:
            return None
        perf_metrics.record_lap("refresh-user-auth-info")

        _save_user_auth_info_in_session(request_with_session, new_user_auth_info)
        perf_metrics.record_lap("save-user-auth-info")

        _save_token_cache_in_session(request_with_session, token_cache)
        perf_metrics.record_lap("save-token-cache")

        authenticated_user = new_user_auth_info.to_authenticated_user()

        # Attach the newly created AuthenticatedUser object to the request's state so that we can avoid going to the
        # session store if this function is called multiple times during the processing of a single request.
        request_with_session.state.authenticated_user_obj = authenticated_user

        LOGGER.debug(f"get_authenticated_user() create/refresh took: {perf_metrics.to_string()}")

        return authenticated_user


def _acquire_access_token_for_resource_scopes(
    cca: msal.ConfidentialClientApplication, resource_name: _ResourceName, account: str
) -> _TokenEntry | None:
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


def _acquire_refreshed_identity_and_tokens(
    token_cache: msal.TokenCache, curr_auth_info: _UserAuthInfo | None
) -> _UserAuthInfo | None:
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
        LOGGER.error("Error getting accounts")
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
    if curr_auth_info and identity_expires_in >= 5 * 60:
        # Just re-use the values from the current auth info
        user_id = curr_auth_info.user_id
        user_name = curr_auth_info.user_name
        id_token_expiry_time = curr_auth_info.user_identity_expires_at
    else:
        token_dict = cca.acquire_token_silent(scopes=config.GRAPH_SCOPES, account=account, force_refresh=True)
        id_token = token_dict.get("id_token") if token_dict else None
        if not id_token:
            LOGGER.error("Error acquiring ID token")
            return None

        id_token_claims_dict = _decode_jwt(id_token)
        try:
            # Could use either 'oid' or 'sub' here, but 'sub' is probably good enough, and it doesn't require the
            # profile scope (in case it matters). See this page for more info:
            # https://learn.microsoft.com/en-us/azure/active-directory/develop/id-tokens
            #
            # May want to switch to 'oid' instead since it is the unique identifier for the user across the tenant!
            user_id = id_token_claims_dict["sub"]
            user_name = id_token_claims_dict["preferred_username"]
            id_token_expiry_time = int(id_token_claims_dict["exp"])
        except ValueError:
            LOGGER.error("Error getting claims from ID token")
            return None

        perf_metrics.record_lap("get-id-token")

    # So we have the identity of an authenticated user
    # This is the minimum requirement for returning info on the user so we can create the new object
    # We'll then continue to populate it with access tokens
    new_auth_info = _UserAuthInfo(
        user_id=user_id,
        user_name=user_name,
        user_identity_expires_at=id_token_expiry_time,
        access_tokens={},
        earliest_expiry_time=0,
    )

    resource_name: _ResourceName
    for resource_name in get_args(_ResourceName):
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

    LOGGER.debug(f"_acquire_refreshed_identity_and_tokens() took: {perf_metrics.to_string()}")

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


def _load_user_auth_info_from_session(request_with_session: Request) -> _UserAuthInfo | None:
    serialized_user_auth_info = request_with_session.session.get("user_auth_info")
    if not serialized_user_auth_info:
        return None

    try:
        user_auth_info = _UserAuthInfo.model_validate_json(serialized_user_auth_info)
    except ValidationError as exc:
        return None

    return user_auth_info


def _save_user_auth_info_in_session(request_with_session: Request, user_auth_info: _UserAuthInfo) -> None:
    request_with_session.session["user_auth_info"] = user_auth_info.model_dump_json()


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
