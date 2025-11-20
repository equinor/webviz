import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { ParametersSelector } from "@modules/_shared/components/ParameterSelector";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../interfaces";
import {
    EnsembleMode,
    EnsembleModeEnumToStringMapping,
    HistogramModeEnumToStringMapping,
    ParameterDistributionPlotType,
    ParameterDistributionPlotTypeEnumToStringMapping,
    ParameterDistributionSortingMethodEnumToStringMapping,
    HistogramMode,
} from "../typesAndEnums";
import { ParameterSortMethod } from "../view/utils/parameterSorting";

import {
    histogramModeAtom,
    selectedVisualizationTypeAtom,
    showConstantParametersAtom,
    showIndividualRealizationValuesAtom,
    showLogParametersAtom,
    showPercentilesAndMeanLinesAtom,
} from "./atoms/baseAtoms";
import { intersectedParameterIdentsAtom } from "./atoms/derivedAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedEnsembleModeAtom,
    selectedParameterIdentsAtom,
    selectedParameterSortingMethodAtom,
    selectedPosteriorEnsembleIdentAtom,
    selectedPriorEnsembleIdentAtom,
} from "./atoms/persistableFixableAtoms";
import { ParameterSortingInfoContent } from "./components/ParameterSortingInfoContent";

export function Settings({ workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);
    const [selectedParameterIdents, setSelectedParameterIdents] = useAtom(selectedParameterIdentsAtom);
    const [showConstantParameters, setShowConstantParameters] = useAtom(showConstantParametersAtom);
    const [showLogParameters, setShowLogParameters] = useAtom(showLogParametersAtom);
    const [selectedVisualizationType, setSelectedVisualizationType] = useAtom(selectedVisualizationTypeAtom);
    const [selectedEnsembleMode, setSelectedEnsembleMode] = useAtom(selectedEnsembleModeAtom);
    const [showIndividualRealizationValues, setShowIndividualRealizationValues] = useAtom(
        showIndividualRealizationValuesAtom,
    );
    const [selectedParameterSortingMethod, setSelectedParameterSortingMethod] = useAtom(
        selectedParameterSortingMethodAtom,
    );

    const [showPercentilesAndMeanLines, setShowPercentilesAndMeanLines] = useAtom(showPercentilesAndMeanLinesAtom);
    const [histogramMode, setHistogramMode] = useAtom(histogramModeAtom);
    const [selectedPriorEnsembleIdent, setSelectedPriorEnsembleIdent] = useAtom(selectedPriorEnsembleIdentAtom);
    const [selectedPosteriorEnsembleIdent, setSelectedPosteriorEnsembleIdent] = useAtom(
        selectedPosteriorEnsembleIdentAtom,
    );
    const intersectedParameterIdents = useAtomValue(intersectedParameterIdentsAtom);
    function handleEnsembleSelectionChange(ensembleIdents: RegularEnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function handleParameterIdentsChange(parameterIdents: ParameterIdent[]) {
        setSelectedParameterIdents(parameterIdents);
    }
    function handleShowConstantParametersChange() {
        setShowConstantParameters((prev) => !prev);
    }
    function handleShowLogParametersChange() {
        setShowLogParameters((prev) => !prev);
    }

    function handleShowIndividualRealizationValuesChange(_: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
        setShowIndividualRealizationValues(checked);
    }
    function handleShowPercentilesAndMeanLinesChange(_: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
        setShowPercentilesAndMeanLines(checked);
    }

    const hasMultipleRegularEnsembles = ensembleSet.getRegularEnsembleArray().length > 1;

    const selectedEnsembleModeAnnotation = useMakePersistableFixableAtomAnnotations(selectedEnsembleModeAtom);
    const selectedParameterSortingMethodAnnotation = useMakePersistableFixableAtomAnnotations(
        selectedParameterSortingMethodAtom,
    );
    const selectedEnsembleIdentsAnnotation = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentsAtom);
    const selectedPriorEnsembleIdentAnnotation =
        useMakePersistableFixableAtomAnnotations(selectedPriorEnsembleIdentAtom);
    const selectedPosteriorEnsembleIdentAnnotation = useMakePersistableFixableAtomAnnotations(
        selectedPosteriorEnsembleIdentAtom,
    );
    const selectedParameterIdentsAnnotation = useMakePersistableFixableAtomAnnotations(selectedParameterIdentsAtom);

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Ensembles" expanded>
                <div className="flex flex-col gap-2">
                    <SettingWrapper label="Analysis mode" annotations={selectedEnsembleModeAnnotation}>
                        <Dropdown
                            options={Object.values(EnsembleMode).map((type: EnsembleMode) => {
                                return {
                                    value: type,
                                    label: EnsembleModeEnumToStringMapping[type],
                                    disabled: !hasMultipleRegularEnsembles && type === EnsembleMode.PRIOR_POSTERIOR,
                                };
                            })}
                            value={selectedEnsembleMode.value}
                            onChange={setSelectedEnsembleMode}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label="Parameter sort method"
                        annotations={selectedParameterSortingMethodAnnotation}
                        help={{
                            title: "Parameter Sorting Methods",
                            content: <ParameterSortingInfoContent />,
                        }}
                    >
                        <Dropdown
                            options={Object.values(ParameterSortMethod).map((type: ParameterSortMethod) => {
                                return {
                                    value: type,
                                    label: ParameterDistributionSortingMethodEnumToStringMapping[type],
                                    disabled:
                                        selectedEnsembleMode.value === EnsembleMode.INDEPENDENT &&
                                        type !== ParameterSortMethod.ALPHABETICAL,
                                };
                            })}
                            value={selectedParameterSortingMethod.value}
                            onChange={setSelectedParameterSortingMethod}
                        />
                    </SettingWrapper>
                    {selectedEnsembleMode.value === EnsembleMode.INDEPENDENT && (
                        <SettingWrapper label="Selected ensembles" annotations={selectedEnsembleIdentsAnnotation}>
                            <EnsembleSelect
                                ensembles={ensembleSet.getRegularEnsembleArray()}
                                ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                                value={selectedEnsembleIdents.value}
                                size={5}
                                multiple={true}
                                onChange={handleEnsembleSelectionChange}
                            />
                        </SettingWrapper>
                    )}
                    {selectedEnsembleMode.value === EnsembleMode.PRIOR_POSTERIOR && (
                        <>
                            <SettingWrapper
                                label="Select prior ensemble"
                                annotations={selectedPriorEnsembleIdentAnnotation}
                            >
                                <EnsembleDropdown
                                    ensembles={ensembleSet.getRegularEnsembleArray()}
                                    ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                                    value={selectedPriorEnsembleIdent.value}
                                    placeholder="Select prior ensemble"
                                    onChange={setSelectedPriorEnsembleIdent}
                                />
                            </SettingWrapper>
                            <SettingWrapper
                                label="Select posterior ensemble"
                                annotations={selectedPosteriorEnsembleIdentAnnotation}
                            >
                                <EnsembleDropdown
                                    ensembles={ensembleSet.getRegularEnsembleArray()}
                                    ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                                    value={selectedPosteriorEnsembleIdent.value}
                                    placeholder="Select posterior ensemble"
                                    onChange={setSelectedPosteriorEnsembleIdent}
                                />
                            </SettingWrapper>
                        </>
                    )}
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Visualization" expanded>
                <div className="flex flex-col gap-2">
                    <SettingWrapper label="Plot type">
                        <Dropdown
                            options={Object.values(ParameterDistributionPlotType).map(
                                (type: ParameterDistributionPlotType) => {
                                    return {
                                        value: type,
                                        label: ParameterDistributionPlotTypeEnumToStringMapping[type],
                                    };
                                },
                            )}
                            value={selectedVisualizationType}
                            onChange={setSelectedVisualizationType}
                        />
                    </SettingWrapper>
                    <SettingWrapper label="Histogram mode:">
                        <Dropdown
                            options={Object.values(HistogramMode).map((mode: HistogramMode) => {
                                return {
                                    value: mode,
                                    label: HistogramModeEnumToStringMapping[mode],
                                };
                            })}
                            value={histogramMode}
                            onChange={setHistogramMode}
                            disabled={selectedVisualizationType !== ParameterDistributionPlotType.HISTOGRAM}
                        />
                    </SettingWrapper>
                    <div className="mt-2">
                        <Checkbox
                            label="Show individual realization values"
                            disabled={selectedVisualizationType === ParameterDistributionPlotType.HISTOGRAM}
                            checked={showIndividualRealizationValues}
                            onChange={handleShowIndividualRealizationValuesChange}
                        />
                        <Checkbox
                            label="Show markers for P10, Mean, P90"
                            checked={showPercentilesAndMeanLines}
                            onChange={handleShowPercentilesAndMeanLinesChange}
                        />
                    </div>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Parameter selection" expanded>
                <div className="flex flex-col gap-2">
                    <Checkbox
                        label="Show nonvarying parameters"
                        checked={showConstantParameters}
                        onChange={handleShowConstantParametersChange}
                    />
                    <Checkbox
                        label="Show LOG parameters"
                        checked={showLogParameters}
                        onChange={handleShowLogParametersChange}
                    />
                    <SettingWrapper annotations={selectedParameterIdentsAnnotation}>
                        <ParametersSelector
                            allParameterIdents={intersectedParameterIdents}
                            selectedParameterIdents={selectedParameterIdents.value ?? []}
                            onChange={handleParameterIdentsChange}
                        />
                    </SettingWrapper>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
