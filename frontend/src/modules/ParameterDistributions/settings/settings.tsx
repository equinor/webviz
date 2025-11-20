import React from "react";

import { Help } from "@mui/icons-material";
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
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { ParametersSelector } from "@modules/_shared/components/ParameterSelector";

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
import { ParameterSortingInfoDialog } from "./components/ParameterSortingInfoDialog";

export function Settings({ workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);
    const infoButtonRef = React.useRef<HTMLButtonElement>(null);

    const handleInfoButtonClick = React.useCallback(() => {
        setIsInfoDialogOpen(true);
    }, []);
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

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Ensembles" expanded>
                <>
                    <Label text="Analysis mode:">
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
                    </Label>
                    <Label
                        wrapperClassName="mt-2"
                        text="Parameter sort method:"
                        endAdornment={
                            <IconButton
                                ref={infoButtonRef}
                                color="primary"
                                size="small"
                                onClick={handleInfoButtonClick}
                            >
                                <Help fontSize="inherit" />
                            </IconButton>
                        }
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
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
                            </div>
                        </div>
                    </Label>
                    {selectedEnsembleMode.value === EnsembleMode.INDEPENDENT && (
                        <Label wrapperClassName="mt-2" text="Select ensembles:">
                            <EnsembleSelect
                                ensembles={ensembleSet.getRegularEnsembleArray()}
                                ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                                value={selectedEnsembleIdents.value}
                                size={5}
                                multiple={true}
                                onChange={handleEnsembleSelectionChange}
                            />
                        </Label>
                    )}
                    {selectedEnsembleMode.value === EnsembleMode.PRIOR_POSTERIOR && (
                        <>
                            <Label wrapperClassName="mt-2" text="Select prior ensemble:">
                                <EnsembleDropdown
                                    ensembles={ensembleSet.getRegularEnsembleArray()}
                                    ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                                    value={selectedPriorEnsembleIdent.value}
                                    placeholder="Select prior ensemble"
                                    onChange={setSelectedPriorEnsembleIdent}
                                />
                            </Label>
                            <Label wrapperClassName="mt-2" text="Select posterior ensemble:">
                                <EnsembleDropdown
                                    ensembles={ensembleSet.getRegularEnsembleArray()}
                                    ensembleRealizationFilterFunction={filterEnsembleRealizationsFunc}
                                    value={selectedPosteriorEnsembleIdent.value}
                                    placeholder="Select posterior ensemble"
                                    onChange={setSelectedPosteriorEnsembleIdent}
                                />
                            </Label>
                        </>
                    )}
                </>
            </CollapsibleGroup>
            <CollapsibleGroup title="Visualization" expanded>
                <>
                    <Label text="Plot type:">
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
                    </Label>
                    <Label text="Histogram mode:">
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
                    </Label>
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
                </>
            </CollapsibleGroup>
            <CollapsibleGroup title="Parameter selection" expanded>
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
                <ParametersSelector
                    allParameterIdents={intersectedParameterIdents}
                    selectedParameterIdents={selectedParameterIdents.value ?? []}
                    onChange={handleParameterIdentsChange}
                />
            </CollapsibleGroup>
            <ParameterSortingInfoDialog
                isOpen={isInfoDialogOpen}
                onClose={() => setIsInfoDialogOpen(false)}
                anchorElement={infoButtonRef.current}
            />
        </div>
    );
}
