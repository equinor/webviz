from dataclasses import dataclass


@dataclass(frozen=True, kw_only=True)
class ServicesConfig:
    sumo_env: str
    smda_subscription_key: str
    enterprise_subscription_key: str
    surface_query_url: str
    vds_host_address: str
    redis_user_session_url: str


# Process-wide state (private to package)
_global_config: ServicesConfig | None = None


def init_services_config(config: ServicesConfig) -> None:
    """
    One-time initialization of configuration for the services package.
    """
    # pylint: disable=global-statement
    global _global_config
    if _global_config is not None:
        return
    _global_config = config


def get_services_config() -> ServicesConfig:
    """
    Get the services configuration. Requires prior call to init_services_config().
    """
    if _global_config is None:
        raise RuntimeError("ServicesConfig is not initialized, call init_services_config() first")

    return _global_config
