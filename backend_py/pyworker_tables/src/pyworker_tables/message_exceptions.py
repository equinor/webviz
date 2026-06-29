

class MessageProcessingError(Exception):
    """Base class for errors that occur during message processing"""
    pass


class MessageRetryableError(MessageProcessingError):
    """Temporary failure, message may succeed if retried"""
    pass


class MessagePermanentError(MessageProcessingError):
    """Permanent failure, message should go to DLQ"""
    pass


class MessageShutdownRequestedError(MessageProcessingError):
    """Shutdown requested, message processing should be aborted and message abandoned"""
    pass

