import logging
import base64
import hashlib
import hmac

from opentelemetry import trace
from starlette.requests import Request
from starlette.types import ASGIApp, Scope, Receive, Send
from webviz_services.utils.authenticated_user import AuthenticatedUser

LOGGER = logging.getLogger(__name__)


class OtelSpanClientAddressEnrichmentMiddleware:
    """
    Middleware that enriches OpenTelemetry spans with client address information from the request.

    Since we're normally running behind a proxy, this middleware must be placed after proxy middleware,
    in our case ProxyHeadersMiddleware, which populates the client address information from the X-Forwarded-For header.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        curr_span = trace.get_current_span()
        if curr_span.is_recording():
            request = Request(scope)
            if request.client:
                # Which span attribute(s) should we use for client IP visibility in Application Insights?
                #
                # OpenTelemetry semantic conventions use "client.address" for the client IP.
                # Azure Monitor/Application Insights can use this to populate request IP data and derive
                # geolocation, but OTel-to-Azure field mapping can be a bit unreliable in practice.
                #
                # Therefore we set:
                # - "client.address" as the modern semconv-compliant attribute
                # - "http.client_ip" as a pragmatic compatibility attribute for Azure visibility
                #
                # Note: this only works correctly if request.client.host contains the real client IP, e.g. when proxy
                # headers are trusted and parsed correctly.
                curr_span.set_attribute("client.address", request.client.host)
                curr_span.set_attribute("http.client_ip", request.client.host)
                # curr_span.set_attribute("net.peer.ip", request.client.host)  # optional fallback

                # Setting the actual values as custom attributes on app.* is useful for troubleshooting
                # curr_span.set_attribute("app.client_ip_observed", request.client.host)
            else:
                LOGGER.warning("OtelSpanClientAddressEnrichmentMiddleware: Could not get client IP from request")

        await self.app(scope, receive, send)


class OtelSpanEndUserEnrichmentMiddleware:
    """
    Middleware that enriches OpenTelemetry spans with end user information from the request.
    """

    def __init__(self, app: ASGIApp, hmac_secret_key: str) -> None:
        self.app = app

        # HMAC secret key must be provided and non-empty to ensure we don't accidentally log any PII
        if not isinstance(hmac_secret_key, str) or not hmac_secret_key.strip():
            raise ValueError("hmac_secret_key must be provided for OtelSpanEndUserEnrichmentMiddleware")

        self.hmac_secret_key = hmac_secret_key

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        curr_span = trace.get_current_span()
        if curr_span.is_recording():
            request = Request(scope)
            maybe_authenticated_user_obj = getattr(request.state, "authenticated_user_obj", None)
            if maybe_authenticated_user_obj and isinstance(maybe_authenticated_user_obj, AuthenticatedUser):
                # user_name = maybe_authenticated_user_obj.get_username()
                user_id = maybe_authenticated_user_obj.get_user_id()
                pseudonym = _pseudonymize_user_id(self.hmac_secret_key, user_id)
                # LOGGER.debug(f" OtelSpanEndUserEnrichmentMiddleware: {user_name=}, {user_id=}, {pseudonym=}")

                # Shows up as "Auth Id", "Authenticated user Id" or user_AuthenticatedId in Application Insights
                curr_span.set_attribute("enduser.id", pseudonym)

                # Shows up as "User Id" or "user_Id" in Application Insights
                curr_span.set_attribute("enduser.pseudo.id", pseudonym)

                # Setting the actual values as custom attributes on app.* is useful for troubleshooting
                # curr_span.set_attribute("app.user_name_raw", f"cust__{user_name}")
                # curr_span.set_attribute("app.user_id_raw", f"cust__{user_id}")
                # curr_span.set_attribute("app.user_id_pseudonym", f"cust__{pseudonym}")
            else:
                LOGGER.warning("OtelSpanEndUserEnrichmentMiddleware: Could not get end user information from request")

        await self.app(scope, receive, send)


def _pseudonymize_user_id(secret_key: str, user_id: str) -> str:
    # Create an HMAC digest of the user ID which is irreversible without the secret key.
    # This way we can have a consistent pseudonym for the same user ID, but it cannot be traced back to the original user ID without the secret key.
    digest_bytes = hmac.digest(key=secret_key.encode("utf-8"), msg=user_id.encode("utf-8"), digest=hashlib.sha256)

    # Encode the digest using base32 (all caps + digits, no special characters) and take the first 12 characters for a shorter pseudonym.
    encoded_digest = base64.b32encode(digest_bytes).decode("ascii").rstrip("=")
    return f"usr_{encoded_digest[:12]}"
