import logging


def ensure_console_log_handler_is_configured() -> None:
    root_logger = logging.getLogger()

    # Look for the default console handler that is added by the Python logging module
    console_handler: logging.StreamHandler | None = None
    for handler in root_logger.handlers:
        if isinstance(handler, logging.StreamHandler):
            console_handler = handler
            break

    if not console_handler:
        console_handler = logging.StreamHandler()
        root_logger.addHandler(console_handler)

    # Set our default format string
    formatter = logging.Formatter("%(asctime)s %(levelname)-3s [%(name)s]: %(message)s", datefmt="%H:%M:%S")
    console_handler.setFormatter(formatter)


def setup_normal_log_levels() -> None:
    # Set baseline logging level to INFO
    logging.getLogger().setLevel(logging.INFO)

    # Make sure some of the more noisy loggers are limited to WARNING
    logging.getLogger("xtgeo").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("azure").setLevel(logging.WARNING)
