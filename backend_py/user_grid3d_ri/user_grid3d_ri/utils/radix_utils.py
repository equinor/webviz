import logging
import json
import os

LOGGER = logging.getLogger(__name__)

# Seems to be one way of know if we're running in Radix or locally
IS_ON_RADIX_PLATFORM = os.getenv("RADIX_APP") is not None


def read_radix_job_payload_as_json() -> dict | None:
    payload_filename = "/compute/args/payload"

    LOGGER.debug(f"read_radix_job_payload_as_json() - {payload_filename=}")

    try:
        with open(payload_filename, encoding="utf-8") as f:
            file_contents = f.read()
            LOGGER.debug(f"read_radix_job_payload_as_json() - {file_contents=}")

            payload_dict = json.loads(file_contents)
            LOGGER.debug(f"read_radix_job_payload_as_json() - {payload_dict=}")

            return payload_dict

    except (OSError, json.JSONDecodeError) as exception:
        LOGGER.error(f"Failed to read radix payload file: {payload_filename}, {exception=}")
        return None
