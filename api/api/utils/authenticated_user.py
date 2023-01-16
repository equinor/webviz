from typing import Optional


class AuthenticatedUser:
    def __init__(
        self,
        user_id: str,
        username: str,
        sumo_access_token: Optional[str],
        smda_access_token: Optional[str],
        pdm_access_token: Optional[str],
        ssdl_access_token: Optional[str],
    ) -> None:
        self._user_id = user_id
        self._username = username
        self._sumo_access_token = sumo_access_token
        self._smda_access_token = smda_access_token
        self._pdm_access_token = pdm_access_token
        self._ssdl_access_token = ssdl_access_token

    def get_username(self) -> str:
        return self._username

    def get_sumo_access_token(self) -> str:
        if (
            isinstance(self._sumo_access_token, str)
            and len(self._sumo_access_token) > 0
        ):
            return self._sumo_access_token

        raise ValueError("User has no sumo access token")

    def has_sumo_access_token(self) -> bool:
        try:
            self.get_sumo_access_token()
            return True
        except:
            return False

    def get_smda_access_token(self) -> str:
        if (
            isinstance(self._smda_access_token, str)
            and len(self._smda_access_token) > 0
        ):
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
        if (
            isinstance(self._ssdl_access_token, str)
            and len(self._ssdl_access_token) > 0
        ):
            return self._ssdl_access_token

        raise ValueError("User has no ssdl access token")

    def has_ssdl_access_token(self) -> bool:
        try:
            self.get_ssdl_access_token()
            return True
        except:
            return False
