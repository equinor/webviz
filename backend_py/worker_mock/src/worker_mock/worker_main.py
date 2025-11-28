import os
import sys
import asyncio
import logging

logging.basicConfig(format="%(asctime)s %(levelname)-7s [%(name)s]: %(message)s", datefmt="%H:%M:%S")
logging.getLogger().setLevel(logging.INFO)

LOGGER = logging.getLogger(__name__)


# Import and configure telemetry first
if os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING"):
    from azure.monitor.opentelemetry import configure_azure_monitor

    LOGGER.info("Configuring Azure Monitor telemetry for worker")

    # Due to our default log level of DEBUG, these loggers become quite noisy, so limit them to INFO or WARNING
    logging.getLogger("urllib3").setLevel(logging.INFO)
    logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
    logging.getLogger("azure.monitor.opentelemetry").setLevel(logging.INFO)
    logging.getLogger("azure.monitor.opentelemetry.exporter").setLevel(logging.WARNING)

    configure_azure_monitor()

    # configure_azure_monitor(
    #     enable_live_metrics=True,
    #     logging_formatter=logging.Formatter("[%(name)s]: %(message)s"),
    #     instrumentation_options={
    #         "azure_sdk": {"enabled": True},
    #     },
    # )
else:
    LOGGER.warning("Skipping telemetry configuration for worker, APPLICATIONINSIGHTS_CONNECTION_STRING env variable not set.")


from opentelemetry.propagate import extract
from opentelemetry.propagate import inject
from opentelemetry import trace

from azure.identity.aio import DefaultAzureCredential
from azure.servicebus.aio import ServiceBusClient, ServiceBusReceiver
from azure.servicebus import ServiceBusReceivedMessage




def _normalize_sb_props(props: dict | None) -> dict[str, str]:
    if not props:
        return {}
    norm: dict[str, str] = {}
    for k, v in props.items():
        kk = k.decode() if isinstance(k, (bytes, bytearray)) else str(k)
        vv = v.decode() if isinstance(v, (bytes, bytearray)) else str(v)
        norm[kk.lower()] = vv
    # Some Azure SDKs set only "Diagnostic-Id"; map it to W3C if "traceparent" is missing
    if "traceparent" not in norm and "diagnostic-id" in norm:
        norm["traceparent"] = norm["diagnostic-id"]
    return norm




async def main_async() -> int:
    LOGGER.info("Starting worker...")
    LOGGER.info("========================================")

    sb_conn_string = os.getenv("SERVICEBUS_CONNECTION_STRING")
    LOGGER.info(f"{sb_conn_string=}")

    if sb_conn_string:
        LOGGER.info("Using SERVICEBUS_CONNECTION_STRING from environment")
        client = ServiceBusClient.from_connection_string(conn_str=sb_conn_string, retry_total=10)
    else:
        LOGGER.info("Using DefaultAzureCredential for authentication")
        LOGGER.info(f"AZURE_TENANT_ID: {os.getenv('AZURE_TENANT_ID')}")
        LOGGER.info(f"AZURE_CLIENT_ID: {os.getenv('AZURE_CLIENT_ID')}")

        # Relies on AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET being set in environment
        credential = DefaultAzureCredential()
        LOGGER.info(f"{type(credential)=}")

        fully_qualified_sb_namespace = "webviz-test.servicebus.windows.net"
        client = ServiceBusClient(fully_qualified_namespace=fully_qualified_sb_namespace, credential=credential)

    queue_name = "test-queue"
    LOGGER.info(f"{queue_name=}")

    async with client:
        receiver: ServiceBusReceiver = client.get_queue_receiver(
            queue_name=queue_name,
            max_wait_time=None  # seconds to wait for messages before returning
        )

        async with receiver:
            LOGGER.info("---------------")
            LOGGER.info("Waiting for messages...")
            LOGGER.info("---------------")

            msg: ServiceBusReceivedMessage
            async for msg in receiver:
                # LOGGER.info(f"Got message repr: {repr(msg)=}")
                
                # LOGGER.info(f"{type(msg.application_properties)=}")
                LOGGER.info(f"{msg.application_properties=}")

                props = getattr(msg, "application_properties", {})  # could be bytes
                carrier = _normalize_sb_props(props)
                # LOGGER.info(f"{carrier=}")

                parent_ctx = extract(carrier)
                # LOGGER.info(f"Got message parent context: {parent_ctx=}")

                tracer = trace.get_tracer(__name__)
                with tracer.start_as_current_span("process_my_message", context=parent_ctx):

                    body_bytes = b"".join(msg.body)
                    body_text = body_bytes.decode("utf-8")
                    LOGGER.info(f"Got message: [{msg.message_id=}, {msg.sequence_number=}]: {body_text=}")

                    # Sleep a bit to simulate work
                    LOGGER.info(f"Sleeping 5 seconds to simulate work... [{msg.message_id=}, {msg.sequence_number=}]: {body_text=}")
                    await asyncio.sleep(5.0)

                    if body_text == "exit":
                        LOGGER.info("Exiting as requested by message")
                        await receiver.complete_message(msg)
                        return 0

                    if body_text == "crash":
                        LOGGER.info("Crashing as requested by message")
                        await receiver.complete_message(msg)
                        raise RuntimeError("Intentional crash triggered by 'crash' message")

                    await receiver.complete_message(msg)
                    LOGGER.info(f"Fake processing done [{msg.message_id=}, {msg.sequence_number=}]: {body_text=}")

            LOGGER.info("No more messages (timeout).")



# !!!!!!!!!!!!!!!!!!!!!!!!!!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!
# https://chatgpt.com/c/68dfbb72-2c78-8325-88f6-f86f68ae51bc


if __name__ == "__main__":
    LOGGER.info("Entering script ...")

    try:
        exit_code = asyncio.run(main_async())
    except Exception:
        # A last-defense guard in case something escapes even higher
        LOGGER.exception("Fatal error outside asyncio.run")
        exit_code = 1

    if not isinstance(exit_code, int):
        exit_code = 1
        
    LOGGER.info(f"Exiting script with code: {exit_code}")

    sys.exit(exit_code if isinstance(exit_code, int) else 1)