import os
from dataclasses import dataclass


@dataclass(frozen=True)
class WorkerConfig:
    sb_fq_namespace: str
    sb_queue_name: str
    sb_payload_fernet_key: str
    redis_cache_url: str
    sumo_env: str


def load_worker_config_from_env() -> WorkerConfig:
    redis_password = os.environ["WEBVIZ_REDIS_CACHE_PASSWORD"]

    return WorkerConfig(
        sb_fq_namespace=os.environ["WEBVIZ_SERVICE_BUS_FQ_NAMESPACE"],
        sb_queue_name=os.environ["WEBVIZ_SERVICE_BUS_QUEUE_NAME"],
        sb_payload_fernet_key=os.environ["WEBVIZ_SERVICE_BUS_PAYLOAD_FERNET_KEY"],
        redis_cache_url=f"redis://:{redis_password}@redis-cache:6379",
        sumo_env=os.getenv("WEBVIZ_SUMO_ENV", "prod"),
    )
