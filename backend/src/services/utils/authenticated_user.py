# pylint: disable=bare-except

from typing import Any, Optional, TypedDict


class AccessTokens(TypedDict):
    graph_access_token: Optional[str]
    sumo_access_token: Optional[str]
    smda_access_token: Optional[str]
    pdm_access_token: Optional[str]
    ssdl_access_token: Optional[str]


class AuthenticatedUser:
    def __init__(
        self,
        user_id: str,
        username: str,
        access_tokens: AccessTokens,
    ) -> None:
        self._user_id = user_id
        self._username = username
        self._graph_access_token = access_tokens.get("graph_access_token", None)
        self._sumo_access_token = access_tokens.get("sumo_access_token", None)
        self._smda_access_token = access_tokens.get("smda_access_token", None)
        self._pdm_access_token = access_tokens.get("pdm_access_token", None)
        self._ssdl_access_token = access_tokens.get("ssdl_access_token", None)

    def __hash__(self) -> int:
        return hash(self._user_id)

    def __eq__(self, other: Any) -> bool:
        return isinstance(other, AuthenticatedUser) and self._user_id == other._user_id

    def get_username(self) -> str:
        return self._username

    def get_graph_access_token(self) -> str:
        if isinstance(self._graph_access_token, str) and self._graph_access_token:
            return self._graph_access_token

        raise ValueError("User has no graph access token")

    def has_graph_access_token(self) -> bool:
        try:
            self.get_graph_access_token()
            return True
        except ValueError:
            return False

    def get_sumo_access_token(self) -> str:
        if isinstance(self._sumo_access_token, str) and len(self._sumo_access_token) > 0:
            return self._sumo_access_token

        raise ValueError("User has no sumo access token")

    def has_sumo_access_token(self) -> bool:
        try:
            self.get_sumo_access_token()
            return True
        except:
            return False

    def get_smda_access_token(self) -> str:
        if isinstance(self._smda_access_token, str) and len(self._smda_access_token) > 0:
            return self._smda_access_token

        raise ValueError("User has no smda access token")

    def has_smda_access_token(self) -> bool:
        try:
            self.get_smda_access_token()
            return True
        except:
            return False

    def get_pdm_access_token(self) -> str:
        if isinstance(self._pdm_access_token, str) and len(self._pdm_access_token) > 0:
            return self._pdm_access_token

        raise ValueError("User has no pdm access token")

    def has_pdm_access_token(self) -> bool:
        try:
            self.get_pdm_access_token()
            return True
        except:
            return False

    def get_ssdl_access_token(self) -> str:
        if isinstance(self._ssdl_access_token, str) and len(self._ssdl_access_token) > 0:
            return self._ssdl_access_token

        raise ValueError("User has no ssdl access token")

    def has_ssdl_access_token(self) -> bool:
        try:
            self.get_ssdl_access_token()
            return True
        except:
            return False
