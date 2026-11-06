from enum import Enum


class Service(str, Enum):
    """The known services that a service layer exception or warning can originate from"""

    GENERAL = "general"
    SUMO = "sumo"
    SMDA = "smda"
    VDS = "vds"
    USER_SESSION = "user_session"
    SSDL = "ssdl"
    PDM = "pdm"
    DATABASE = "database"
