import React from "react";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { ParametersSelector } from "@modules/_shared/components/ParameterSelector";
import { Info } from "@mui/icons-material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import type { Interfaces } from "../interfaces";
import {
    EnsembleMode,
    EnsembleModeEnumToStringMapping,
    ParameterDistributionPlotType,
    ParameterDistributionPlotTypeEnumToStringMapping,
    ParameterDistributionSortingMethodEnumToStringMapping,
} from "../typesAndEnums";
import { ParameterSortMethod } from "../view/utils/parameterSorting";

import {
    userSelectedEnsembleModeAtom,
    selectedVisualizationTypeAtom,
    showConstantParametersAtom,
    showIndividualRealizationValuesAtom,
    showPercentilesAndMeanLinesAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedParameterIdentsAtom,
    userSelectedPosteriorEnsembleIdentAtom,
    userSelectedPriorEnsembleIdentAtom,
    userSelectedParameterSortingMethodAtom,
    showLogParametersAtom,
} from "./atoms/baseAtoms";
import {
    intersectedParameterIdentsAtom,
    selectedEnsembleIdentsAtom,
    selectedParameterIdentsAtom,
    selectedPosteriorEnsembleIdentAtom,
    selectedPriorEnsembleIdentAtom,
    selectedEnsembleModeAtom,
    selectedParameterDistributionSortingMethodAtom,
} from "./atoms/derivedAtoms";
import { ParameterSortingInfoDialog } from "./components/ParameterSortingInfoDialog";

export function Settings({ workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const hasMultipleRegularEnsembles = ensembleSet.getRegularEnsembleArray().length > 1;
    const [isInfoDialogOpen, setIsInfoDialogOpen] = React.useState(false);
    const infoButtonRef = React.useRef<HTMLDivElement>(null);
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);
    const intersectedParameterIdents = useAtomValue(intersectedParameterIdentsAtom);
    const setSelectedParameterIdents = useSetAtom(userSelectedParameterIdentsAtom);
    const selectedParameterIdents = useAtomValue(selectedParameterIdentsAtom);
    const [showConstantParameters, setShowConstantParameters] = useAtom(showConstantParametersAtom);
    const [showLogParameters, setShowLogParameters] = useAtom(showLogParametersAtom);
    const [selectedVisualizationType, setSelectedVisualizationType] = useAtom(selectedVisualizationTypeAtom);
    const setSelectedEnsembleMode = useSetAtom(userSelectedEnsembleModeAtom);
    const selectedEnsembleMode = useAtomValue(selectedEnsembleModeAtom);
    const [showIndividualRealizationValues, setShowIndividualRealizationValues] = useAtom(
        showIndividualRealizationValuesAtom,
    );
    const selectedParameterDistributionSortingMethod = useAtomValue(selectedParameterDistributionSortingMethodAtom);
    const setSelectedParameterDistributionSortingMethod = useSetAtom(userSelectedParameterSortingMethodAtom);
    const [showPercentilesAndMeanLines, setShowPercentilesAndMeanLines] = useAtom(showPercentilesAndMeanLinesAtom);
    const setSelectedPriorEnsembleIdent = useSetAtom(userSelectedPriorEnsembleIdentAtom);
    const selectedPriorEnsembleIdent = useAtomValue(selectedPriorEnsembleIdentAtom);
    const setSelectedPosteriorEnsembleIdent = useSetAtom(userSelectedPosteriorEnsembleIdentAtom);
    const selectedPosteriorEnsembleIdent = useAtomValue(selectedPosteriorEnsembleIdentAtom);

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
                            value={selectedEnsembleMode}
                            onChange={setSelectedEnsembleMode}
                        />
                    </Label>
                    <Label text="Parameter sort method:">
                        <div className="flex items-center gap-2">
                            <Dropdown
                                options={Object.values(ParameterSortMethod).map((type: ParameterSortMethod) => {
                                    return {
                                        value: type,
                                        label: ParameterDistributionSortingMethodEnumToStringMapping[type],
                                        disabled:
                                            selectedEnsembleMode === EnsembleMode.INDEPENDENT &&
                                            type !== ParameterSortMethod.ALPHABETICAL,
                                    };
                                })}
                                value={selectedParameterDistributionSortingMethod}
                                onChange={setSelectedParameterDistributionSortingMethod}
                            />
                            <div
                                ref={infoButtonRef}
                                className="text-blue-500 hover:text-blue-700 cursor-pointer"
                                onClick={() => setIsInfoDialogOpen(!isInfoDialogOpen)}
                                title="Learn more about sorting methods"
                            >
                                <Info fontSize="small" />
                            </div>
                        </div>
                    </Label>
                    {selectedEnsembleMode === EnsembleMode.INDEPENDENT && (
                        <Label wrapperClassName="mt-2" text="Select ensembles:">
                            <EnsembleSelect
                                ensembles={ensembleSet.getRegularEnsembleArray()}
                                onChange={handleEnsembleSelectionChange}
                                value={selectedEnsembleIdents}
                                size={5}
                                multiple={true}
                            />
                        </Label>
                    )}
                    {selectedEnsembleMode === EnsembleMode.PRIOR_POSTERIOR && (
                        <>
                            <Label wrapperClassName="mt-2" text="Select prior ensemble:">
                                <EnsembleDropdown
                                    ensembles={ensembleSet.getRegularEnsembleArray()}
                                    onChange={setSelectedPriorEnsembleIdent}
                                    value={selectedPriorEnsembleIdent}
                                    placeholder="Select prior ensemble"
                                />
                            </Label>
                            <Label wrapperClassName="mt-2" text="Select posterior ensemble:">
                                <EnsembleDropdown
                                    ensembles={ensembleSet.getRegularEnsembleArray()}
                                    onChange={setSelectedPosteriorEnsembleIdent}
                                    value={selectedPosteriorEnsembleIdent}
                                    placeholder="Select posterior ensemble"
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
                    selectedParameterIdents={selectedParameterIdents}
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
