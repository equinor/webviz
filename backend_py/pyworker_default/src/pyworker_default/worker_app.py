import os
import asyncio
import logging
import signal

from azure.identity.aio import DefaultAzureCredential
from azure.servicebus.aio import ServiceBusClient, ServiceBusReceiver, AutoLockRenewer
from azure.servicebus import ServiceBusReceivedMessage
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry.sdk.resources import Resource

from webviz_core_utils.radix_utils import is_running_on_radix_platform
from webviz_core_utils.azure_monitor_destination import AzureMonitorDestination
from webviz_services.services_config import ServicesConfig, init_services_config
from webviz_services.utils.httpx_async_client_wrapper import HTTPX_ASYNC_CLIENT_WRAPPER
from webviz_services.utils.task_meta_tracker import TaskMetaTrackerFactory

from .process_message import process_message_async
from .worker_config import WorkerConfig, load_worker_config_from_env
from .utils import message_decryption
from .utils.abort_signal import AbortSignal
from .utils.worker_logging import configure_logging

_logger = logging.getLogger(__name__)


def _setup_azure_monitor_telemetry_for_worker(service_name: str) -> None:
    _logger.info(f"Configuring Azure Monitor telemetry for {service_name}...")

    # Limit these to INFO or WARNING
    logging.getLogger("urllib3").setLevel(logging.INFO)
    logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
    logging.getLogger("azure.monitor.opentelemetry").setLevel(logging.INFO)
    logging.getLogger("azure.monitor.opentelemetry.exporter").setLevel(logging.WARNING)

    if is_running_on_radix_platform():
        azmon_dest = AzureMonitorDestination.from_radix_env()
    else:
        # Picks up APPLICATIONINSIGHTS_CONNECTION_STRING env variable if it is set, and configures from that.
        azmon_dest = AzureMonitorDestination.for_local_dev(service_name=service_name)

    if not azmon_dest:
        _logger.warning(f"Skipping telemetry configuration for {service_name}, no valid AzureMonitorDestination")
        return

    _logger.info(
        f"Configuring Azure Monitor telemetry for {service_name}, resource attributes: {azmon_dest.resource_attributes}"
    )

    # !!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!
    # We should revisit the logging formatter we use for telemetry
    # I don't think we should include the logger name in the log message, since that is already included in the telemetry data.
    # !!!!!!!!!!!!!!!!!!!!!
    # !!!!!!!!!!!!!!!!!!!!!
    configure_azure_monitor(
        connection_string=azmon_dest.insights_connection_string,
        resource=Resource.create(attributes=azmon_dest.resource_attributes),
        sampling_ratio=1.0,
        # logging_formatter=logging.Formatter("[%(name)s]: %(message)s"),
    )


def _create_shutdown_event() -> asyncio.Event:
    shutdown_event = asyncio.Event()

    def _request_shutdown(signal_number: int) -> None:
        if shutdown_event.is_set():
            return
        signal_name = signal.strsignal(signal_number) or str(signal_number)
        _logger.info(f"Received shutdown signal, stopping worker ({signal_name=})")
        shutdown_event.set()

    try:
        loop = asyncio.get_running_loop()
        loop.add_signal_handler(signal.SIGINT, _request_shutdown, signal.SIGINT)
        loop.add_signal_handler(signal.SIGTERM, _request_shutdown, signal.SIGTERM)
    except (NotImplementedError, RuntimeError):
        _logger.warning("Failed to register signal handlers; graceful shutdown by signal may be unavailable")

    return shutdown_event


async def _run_worker_loop(worker_config: WorkerConfig, shutdown_event: asyncio.Event) -> None:
    fully_qualified_sb_namespace = worker_config.sb_fq_namespace
    queue_name = worker_config.sb_queue_name
    _logger.info(f"{fully_qualified_sb_namespace=}")
    _logger.info(f"{queue_name=}")

    # Relies on AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET being set in environment
    _logger.info("Using DefaultAzureCredential for authentication")
    _logger.info(f"AZURE_TENANT_ID: {os.getenv('AZURE_TENANT_ID')}")
    _logger.info(f"AZURE_CLIENT_ID: {os.getenv('AZURE_CLIENT_ID')}")
    credential = DefaultAzureCredential()
    _logger.info(f"{type(credential)=}")

    async with credential:
        sb_client = ServiceBusClient(
            fully_qualified_namespace=fully_qualified_sb_namespace,
            credential=credential,
        )
        # Use AutoLockRenewer to automatically renew the lock on messages while they are being processed.
        # Without this, if processing takes longer than the configured lock duration (default 1 min),
        # the message will be unlocked and may be received by another worker, leading to duplicate processing.
        lock_renewer = AutoLockRenewer(max_lock_renewal_duration=15 * 60)

        async with sb_client, lock_renewer:
            # The reason for the type ignore below is that the async get_queue_receiver is mis-annotated in the SDK to
            # expect the sync AutoLockRenewer, but at runtime it requires the async one (from azure.servicebus.aio)
            sb_receiver: ServiceBusReceiver = sb_client.get_queue_receiver(
                client_identifier="pyworker-default",
                queue_name=queue_name,
                auto_lock_renewer=lock_renewer,  # type: ignore[arg-type]
            )

            async with sb_receiver:
                _logger.info("=== WORKER READY: waiting to receive messages")

                # Cooperative abort signal passed to tasks so they can abort promptly when a shutdown is requested
                abort_signal = AbortSignal(shutdown_event)

                while not shutdown_event.is_set():
                    # We poll for messages with a short timeout, so we can check for shutdown events frequently.
                    # Currently we only grab and process one message at a time, but this could be changed to
                    # process multiple messages concurrently if needed.
                    messages: list[ServiceBusReceivedMessage] = await sb_receiver.receive_messages(
                        max_message_count=1, max_wait_time=2
                    )

                    # Make sure we don't start any new processing if a shutdown has been requested
                    # Abandon any messages we received so they can be retried later (by another worker).
                    if shutdown_event.is_set():
                        _logger.info("Worker shutdown requested; abandoning received messages before exiting worker")
                        for msg in messages:
                            await sb_receiver.abandon_message(msg)
                        break

                    if len(messages) > 0:
                        _logger.debug(f"Worker received {len(messages)} message(s) from Service Bus")

                    # There should only be one message in the list, since we set max_message_count=1, but we still iterate over it to be safe.
                    for msg in messages:
                        await process_message_async(sb_receiver, msg, abort_signal)

                _logger.info("Worker shutdown requested; exiting worker loop")


async def run_app_async() -> None:

    configure_logging()

    logging.getLogger("pyworker_default").setLevel(logging.DEBUG)

    # Limit logging from the more noisy loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("azure.servicebus").setLevel(logging.WARNING)

    _logger.info("=== Starting worker pyworker-default...")

    _setup_azure_monitor_telemetry_for_worker("pyworker-default")

    # Read our own config from environment variables
    worker_config: WorkerConfig = load_worker_config_from_env()

    # Initialize the webviz-services library, which is used by some of our message handlers
    services_config = ServicesConfig(
        sumo_env=worker_config.sumo_env,
        smda_subscription_key="",
        enterprise_subscription_key="",
        surface_query_url="",
        vds_host_address="",
        redis_cache_url=worker_config.redis_cache_url,
    )
    init_services_config(services_config)

    TaskMetaTrackerFactory.initialize(redis_url=worker_config.redis_cache_url)
    HTTPX_ASYNC_CLIENT_WRAPPER.start()
    message_decryption.initialize(worker_config.sb_payload_fernet_key)

    shutdown_event = _create_shutdown_event()

    try:
        await _run_worker_loop(worker_config, shutdown_event)
    finally:
        await HTTPX_ASYNC_CLIENT_WRAPPER.stop_async()
