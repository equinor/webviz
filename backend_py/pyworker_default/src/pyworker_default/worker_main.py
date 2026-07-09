import asyncio
import logging

from .worker_app import run_app_async

_logger = logging.getLogger()


def main() -> int:
    try:
        asyncio.run(run_app_async())
        return 0
    except KeyboardInterrupt:
        return 130
    except Exception:
        _logger.exception("Fatal error")
        return 1


# !!!!!!!!!!!!!!!!!!!!!!!!!!!!
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!
# https://chatgpt.com/c/68dfbb72-2c78-8325-88f6-f86f68ae51bc


if __name__ == "__main__":
    raise SystemExit(main())
