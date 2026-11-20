from dataclasses import replace
from typing import cast

from webviz_services.service_exceptions import InvalidDataError, Service
from webviz_services.sumo_access.ensemble_lineage import ResolvedEnsemble
from webviz_services.sumo_access.parameter_types import EnsembleParameter, ParameterSourceEnsemble

SENSITIVITY_PARAMETER_NAMES = ("SENSNAME", "SENSCASE")


def merge_restart_parameters(
    own_parameters: list[EnsembleParameter],
    ancestors_and_parameters: list[tuple[ResolvedEnsemble, list[EnsembleParameter]]],
    own_ensemble_label: str,
) -> tuple[list[EnsembleParameter], list[str]]:
    """Combine an ensemble's own parameters with the parameters of its restart ancestors.

    Args:
        own_parameters: The ensemble's own parameters
        ancestors_and_parameters: Restart ancestors with their parameters, nearest parent first
        own_ensemble_label: User-facing label of the ensemble, used in messages

    Returns:
        The merged parameters (own first, then ancestors nearest first) and non-fatal warnings.
        Ancestors sharing no realizations with the ensemble are skipped. Other ancestors' parameters are
        filtered to the ensemble's realizations and tagged with their source ensemble.
        SENSNAME/SENSCASE are kept once, from the ensemble itself.

    Raises:
        InvalidDataError: If SENSNAME/SENSCASE are not present in all combined sources or not aligned, or if
            any (name, group) parameter identifier exists in more than one combined source.
    """
    own_realizations = {real for param in own_parameters for real in param.realizations}

    warnings: list[str] = []
    overlapping_ancestors_and_parameters: list[tuple[ResolvedEnsemble, list[EnsembleParameter]]] = []
    for ancestor, ancestor_parameters in ancestors_and_parameters:
        ancestor_realizations = {real for param in ancestor_parameters for real in param.realizations}
        if own_realizations.isdisjoint(ancestor_realizations):
            warnings.append(
                f"Restart ensemble {ancestor.label} shares no realizations with {own_ensemble_label}; its "
                "parameters were not combined."
            )
            continue

        overlapping_ancestors_and_parameters.append((ancestor, ancestor_parameters))
        missing_realizations = sorted(own_realizations - ancestor_realizations)
        if missing_realizations:
            warnings.append(
                f"Restart ensemble {ancestor.label} does not have realization(s) "
                f"{', '.join(str(real) for real in missing_realizations)}; parameters from the restart ensemble "
                "have no values for these realizations."
            )

    _verify_sensitivity_parameters_aligned(own_parameters, overlapping_ancestors_and_parameters, own_ensemble_label)

    ancestors_and_non_sens_parameters = [
        (ancestor, [param for param in parameters if param.name not in SENSITIVITY_PARAMETER_NAMES])
        for ancestor, parameters in overlapping_ancestors_and_parameters
    ]
    _verify_no_conflicting_parameters(own_parameters, ancestors_and_non_sens_parameters, own_ensemble_label)

    merged_parameters = list(own_parameters)
    for ancestor, ancestor_parameters in ancestors_and_non_sens_parameters:
        source_ensemble = ParameterSourceEnsemble(
            case_uuid=ancestor.case_uuid,
            case_name=ancestor.case_name,
            ensemble_name=ancestor.ensemble_name,
        )
        for param in ancestor_parameters:
            merged_parameters.append(_filter_parameter_to_realizations(param, own_realizations, source_ensemble))

    return merged_parameters, warnings


def _filter_parameter_to_realizations(
    parameter: EnsembleParameter, realizations: set[int], source_ensemble: ParameterSourceEnsemble
) -> EnsembleParameter:
    kept_indices = [idx for idx, real in enumerate(parameter.realizations) if real in realizations]
    filtered_values = cast(list[float] | list[int] | list[str], [parameter.values[idx] for idx in kept_indices])
    return replace(
        parameter,
        realizations=[parameter.realizations[idx] for idx in kept_indices],
        values=filtered_values,
        is_constant=len(set(filtered_values)) == 1,
        source_ensemble=source_ensemble,
    )


def _verify_sensitivity_parameters_aligned(
    own_parameters: list[EnsembleParameter],
    ancestors_and_parameters: list[tuple[ResolvedEnsemble, list[EnsembleParameter]]],
    own_ensemble_label: str,
) -> None:
    own_sens_parameters = _get_sensitivity_parameters_by_name(own_parameters)

    error_messages: list[str] = []
    for ancestor, ancestor_parameters in ancestors_and_parameters:
        ancestor_sens_parameters = _get_sensitivity_parameters_by_name(ancestor_parameters)

        problems: list[str] = []
        for sens_name in SENSITIVITY_PARAMETER_NAMES:
            own_param = own_sens_parameters.get(sens_name)
            ancestor_param = ancestor_sens_parameters.get(sens_name)
            if own_param is not None and ancestor_param is None:
                problems.append(f"{sens_name} is missing in {ancestor.label}")
            elif own_param is None and ancestor_param is not None:
                problems.append(f"{sens_name} is missing in {own_ensemble_label}")
            elif own_param is not None and ancestor_param is not None:
                ancestor_values_by_real = dict(zip(ancestor_param.realizations, ancestor_param.values))
                differing_count = sum(
                    1
                    for real, value in zip(own_param.realizations, own_param.values)
                    if real in ancestor_values_by_real and ancestor_values_by_real[real] != value
                )
                if differing_count > 0:
                    problems.append(f"{sens_name} differs on {differing_count} realization(s)")

        if problems:
            error_messages.append(
                f"Sensitivity parameters (SENSNAME/SENSCASE) differ between {own_ensemble_label} and restart "
                f"ensemble {ancestor.label}: {'; '.join(problems)}."
            )

    if error_messages:
        raise InvalidDataError("\n".join(error_messages), Service.SUMO)


def _get_sensitivity_parameters_by_name(parameters: list[EnsembleParameter]) -> dict[str, EnsembleParameter]:
    sens_parameters: dict[str, EnsembleParameter] = {}
    for param in parameters:
        if param.name in SENSITIVITY_PARAMETER_NAMES and param.name not in sens_parameters:
            sens_parameters[param.name] = param
    return sens_parameters


def _verify_no_conflicting_parameters(
    own_parameters: list[EnsembleParameter],
    ancestors_and_parameters: list[tuple[ResolvedEnsemble, list[EnsembleParameter]]],
    own_ensemble_label: str,
) -> None:
    labelled_sources: list[tuple[str, list[EnsembleParameter]]] = [(own_ensemble_label, own_parameters)]
    labelled_sources.extend((ancestor.label, parameters) for ancestor, parameters in ancestors_and_parameters)

    source_labels_by_ident: dict[tuple[str, str | None], list[str]] = {}
    for label, parameters in labelled_sources:
        for ident in dict.fromkeys((param.name, param.group_name) for param in parameters):
            source_labels_by_ident.setdefault(ident, []).append(label)

    conflicting_idents_by_sources: dict[tuple[str, ...], list[str]] = {}
    for (name, group_name), labels in source_labels_by_ident.items():
        if len(labels) > 1:
            ident_str = f"{group_name}/{name}" if group_name else name
            conflicting_idents_by_sources.setdefault(tuple(labels), []).append(ident_str)

    if not conflicting_idents_by_sources:
        return

    conflict_descriptions = [
        f"parameter(s) {', '.join(idents)} exist in {_describe_sources(list(labels))}"
        for labels, idents in conflicting_idents_by_sources.items()
    ]
    raise InvalidDataError(
        f"Cannot combine parameters from restart ensembles: {'; '.join(conflict_descriptions)}. "
        "Rename or remove the duplicates.",
        Service.SUMO,
    )


def _describe_sources(labels: list[str]) -> str:
    if len(labels) == 2:
        return f"both {labels[0]} and {labels[1]}"
    return f"all of {', '.join(labels[:-1])} and {labels[-1]}"
