from typing import Sequence

from webviz_core_utils.text_warning import TextWarning

# Max number of realizations listed in a warning message, to keep the response header small
_MAX_REALS_IN_MESSAGE = 20


def make_missing_realizations_warning(missing_realizations: Sequence[int], data_source: str) -> TextWarning:
    """
    Create a warning stating that requested realizations are missing from a data source.

    The data_source describes where the realizations are missing from, including the service,
    e.g. "Sumo vector data" or "Sumo surfaces".
    """
    missing = sorted(missing_realizations)
    listed = ", ".join(str(r) for r in missing[:_MAX_REALS_IN_MESSAGE])
    if len(missing) > _MAX_REALS_IN_MESSAGE:
        listed += ", ..."

    if len(missing) == 1:
        message = f"The requested realization is missing from {data_source}: [{listed}]"
    else:
        message = f"{len(missing)} of the requested realizations are missing from {data_source}: [{listed}]"

    return TextWarning(message)
