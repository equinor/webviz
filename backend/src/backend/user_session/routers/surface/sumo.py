import requests


class CustomError(Exception):
    def __init__(self, message, status_code, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv["message"] = self.message
        return rv


class InternalError(CustomError):
    def __init__(self, message, payload=None):
        super().__init__(message, 500, payload)


class Unauthorized(CustomError):
    def __init__(self, message, payload=None):
        super().__init__(message, 401, payload)


class Forbidden(CustomError):
    def __init__(self, message, payload=None):
        super().__init__(message, 403, payload)


class BadRequest(CustomError):
    def __init__(self, message, payload=None):
        super().__init__(message, 400, payload)


def get_base_uri_and_auth_token_for_case(case_id, env, token):
    temp_uri = f"{get_base_uri(env)}/objects('{case_id}')/authtoken"

    body, _ = get_with_token(temp_uri, token)

    base_uri = body["baseuri"].removesuffix("/")
    auth_token = body["auth"]

    return base_uri, auth_token


def get_base_uri(env):
    return f"https://main-sumo-{env}.radix.equinor.com/api/v1"


def get_uri(env, path):
    return f"{get_base_uri(env)}{path}"


def get_with_token(url, token):
    try:
        res = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    except requests.exceptions.RequestException as err:
        raise InternalError(
            f"RequestException: An error occured while handling request: {err}",
            payload={"request_url": url},
        )
    return res.json(), res.status_code
