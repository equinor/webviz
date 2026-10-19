import os
from dataclasses import dataclass

from webviz_core_utils.radix_utils import is_running_on_radix_platform
from webviz_core_utils.service_bus_destination import ServiceBusDestination


@dataclass(frozen=True)
class WorkerConfig:
    sb_namespace: str
    sb_queue_name: str
    sb_emulator_connection_string: str | None
    sb_payload_fernet_key: str
    max_concurrent_tasks: int
    redis_cache_url: str
    sumo_env: str


def load_worker_config_from_env() -> WorkerConfig:

    is_on_radix_platform = is_running_on_radix_platform()

    worker_sb_queue_role = os.environ["WEBVIZ_PYWORKER_SERVICE_BUS_QUEUE_ROLE"]
    sb_dest: ServiceBusDestination
    if is_on_radix_platform:
        sb_dest = ServiceBusDestination.from_radix_env(queue_role=worker_sb_queue_role)
    else:
        sb_dest = ServiceBusDestination.for_local_dev(queue_role=worker_sb_queue_role)

    redis_password = os.environ["WEBVIZ_REDIS_CACHE_PASSWORD"]

    return WorkerConfig(
        sb_namespace=sb_dest.namespace,
        sb_queue_name=sb_dest.queue_name,
        sb_emulator_connection_string=sb_dest.emulator_connection_string,
        sb_payload_fernet_key=os.environ["WEBVIZ_SERVICE_BUS_PAYLOAD_FERNET_KEY"],
        max_concurrent_tasks=int(os.getenv("WEBVIZ_PYWORKER_MAX_CONCURRENT_TASKS", "1")),
        redis_cache_url=f"redis://:{redis_password}@redis-cache:6379",
        sumo_env=os.getenv("WEBVIZ_SUMO_ENV", "prod"),
    )
