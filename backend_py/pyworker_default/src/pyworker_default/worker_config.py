import os
from dataclasses import dataclass

from webviz_core_utils.radix_utils import is_running_on_radix_platform


@dataclass(frozen=True)
class WorkerConfig:
    sb_fq_namespace: str
    sb_queue_name: str
    sb_payload_fernet_key: str
    sb_emulator_connection_string: str | None
    max_concurrent_tasks: int
    redis_cache_url: str
    sumo_env: str


def load_worker_config_from_env() -> WorkerConfig:
    redis_password = os.environ["WEBVIZ_REDIS_CACHE_PASSWORD"]

    sb_emulator_connection_string: str | None = None
    if not is_running_on_radix_platform():
        sb_emulator_connection_string=os.getenv("WEBVIZ_SERVICE_BUS_EMULATOR_CONNECTION_STRING")

    return WorkerConfig(
        sb_fq_namespace=os.environ["WEBVIZ_SERVICE_BUS_FQ_NAMESPACE"],
        sb_queue_name=os.environ["WEBVIZ_SERVICE_BUS_QUEUE_NAME"],
        sb_payload_fernet_key=os.environ["WEBVIZ_SERVICE_BUS_PAYLOAD_FERNET_KEY"],
        sb_emulator_connection_string=sb_emulator_connection_string,
        redis_cache_url=f"redis://:{redis_password}@redis-cache:6379",
        sumo_env=os.getenv("WEBVIZ_SUMO_ENV", "prod"),
        max_concurrent_tasks=int(os.getenv("WEBVIZ_WORKER_MAX_CONCURRENT_TASKS", "1")),
    )
