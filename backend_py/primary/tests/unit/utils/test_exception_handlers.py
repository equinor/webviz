from collections.abc import Iterator
import json

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import pytest

from webviz_services.service_exceptions import Service, ServiceRequestError

from primary.utils.exception_handlers import (
    configure_service_level_exception_handlers,
    make_error_response,
    override_default_fastapi_exception_handlers,
)


@pytest.fixture
def client() -> Iterator[TestClient]:
    app = FastAPI()
    configure_service_level_exception_handlers(app)
    override_default_fastapi_exception_handlers(app)

    @app.get("/http")
    def http_error() -> None:
        raise HTTPException(status_code=403, detail="Forbidden", headers={"X-Error": "preserved"})

    @app.get("/bodyless/{status_code}")
    def bodyless_error(status_code: int) -> None:
        raise HTTPException(status_code=status_code, headers={"X-Error": "preserved"})

    @app.get("/validation")
    def validation(value: int) -> int:
        return value

    @app.get("/service")
    def service_error() -> None:
        raise ServiceRequestError("Service failed", Service.SUMO)

    @app.get("/internal")
    def internal_error() -> None:
        raise RuntimeError("Sensitive internal details")

    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.mark.parametrize("service", [None, Service.SUMO])
def test_create_error_response(service: Service | None) -> None:
    response = make_error_response(
        status_code=503,
        error_type="ServiceUnavailableError",
        message="Unavailable",
        service=service,
        headers={"Retry-After": "10"},
    )
    expected = {"type": "ServiceUnavailableError", "message": "Unavailable"}
    if service is not None:
        expected["service"] = "sumo"

    assert response.status_code == 503
    assert json.loads(response.body) == {"error": expected}
    assert response.headers["retry-after"] == "10"


def test_http_error_preserves_envelope_and_headers(client: TestClient) -> None:
    response = client.get("/http")
    assert response.status_code == 403
    assert response.json() == {"error": {"type": "GeneralError", "message": "Forbidden"}}
    assert response.headers["x-error"] == "preserved"


@pytest.mark.parametrize("status_code", [204, 304])
def test_bodyless_status_preserves_headers(client: TestClient, status_code: int) -> None:
    response = client.get(f"/bodyless/{status_code}")
    assert response.status_code == status_code
    assert response.content == b""
    assert response.headers["x-error"] == "preserved"


def test_validation_error_preserves_message(client: TestClient) -> None:
    response = client.get("/validation", params={"value": "invalid"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["type"] == "RequestValidationError"
    prefix, details = error["message"].split(": ", 1)
    assert prefix == "1 validation error(s)"
    assert json.loads(details) == [
        {
            "msg": "Input should be a valid integer, unable to parse string as an integer",
            "loc": ["query", "value"],
            "input": "invalid",
        }
    ]


def test_service_error_preserves_service(client: TestClient) -> None:
    response = client.get("/service")
    assert response.status_code == 500
    assert response.json() == {"error": {"type": "ServiceRequestError", "message": "Service failed", "service": "sumo"}}


def test_internal_error_does_not_expose_details(client: TestClient) -> None:
    response = client.get("/internal")
    assert response.status_code == 500
    assert response.json() == {"error": {"type": "InternalError", "message": "Internal server error"}}
