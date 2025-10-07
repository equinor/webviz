import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ParametersSelector } from "@modules/ParameterResponseCorrelationMatrixPlot/settings/components/parameterSelector";

import type { Interfaces } from "../interfaces";
import { ParameterDistributionPlotType, ParameterDistributionPlotTypeEnumToStringMapping } from "../typesAndEnums";

import {
    selectedVisualizationTypeAtom,
    showConstantParametersAtom,
    showIndividualRealizationValuesAtom,
    showPercentilesAndMeanLinesAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedParameterIdentsAtom,
} from "./atoms/baseAtoms";
import {
    intersectedParameterIdentsAtom,
    selectedEnsembleIdentsAtom,
    selectedParameterIdentsAtom,
} from "./atoms/derivedAtoms";

export function Settings({ workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);
    const intersectedParameterIdents = useAtomValue(intersectedParameterIdentsAtom);
    const setSelectedParameterIdents = useSetAtom(userSelectedParameterIdentsAtom);
    const selectedParameterIdents = useAtomValue(selectedParameterIdentsAtom);
    const [showConstantParameters, setShowConstantParameters] = useAtom(showConstantParametersAtom);

    const [selectedVisualizationType, setSelectedVisualizationType] = useAtom(selectedVisualizationTypeAtom);
    const [showIndividualRealizationValues, setShowIndividualRealizationValues] = useAtom(
        showIndividualRealizationValuesAtom,
    );
    const [showPercentilesAndMeanLines, setShowPercentilesAndMeanLines] = useAtom(showPercentilesAndMeanLinesAtom);

    function handleEnsembleSelectionChange(ensembleIdents: RegularEnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function handleParameterIdentsChange(parameterIdents: ParameterIdent[]) {
        setSelectedParameterIdents(parameterIdents);
    }
    function handleShowConstantParametersChange() {
        setShowConstantParameters((prev) => !prev);
    }
    function handleVisualizationTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSelectedVisualizationType(event.target.value as ParameterDistributionPlotType);
    }
    function handleShowIndividualRealizationValuesChange(_: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
        setShowIndividualRealizationValues(checked);
    }
    function handleShowPercentilesAndMeanLinesChange(_: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
        setShowPercentilesAndMeanLines(checked);
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Visualization Type" expanded>
                <RadioGroup
                    options={Object.values(ParameterDistributionPlotType).map((type: ParameterDistributionPlotType) => {
                        return { value: type, label: ParameterDistributionPlotTypeEnumToStringMapping[type] };
                    })}
                    value={selectedVisualizationType}
                    onChange={handleVisualizationTypeChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Plot options" expanded>
                <div className="flex flex-col gap-2">
                    {"Show additional data"}
                    <Checkbox
                        label="Individual realization values"
                        disabled={selectedVisualizationType === ParameterDistributionPlotType.HISTOGRAM}
                        checked={showIndividualRealizationValues}
                        onChange={handleShowIndividualRealizationValuesChange}
                    />
                    <Checkbox
                        label="Markers P10, Mean, P90"
                        checked={showPercentilesAndMeanLines}
                        onChange={handleShowPercentilesAndMeanLinesChange}
                    />
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Ensembles" expanded>
                <EnsembleSelect
                    ensembles={ensembleSet.getRegularEnsembleArray()}
                    onChange={handleEnsembleSelectionChange}
                    value={selectedEnsembleIdents}
                    size={5}
                    multiple={true}
                />
            </CollapsibleGroup>

            <CollapsibleGroup title="Parameter selection" expanded>
                <Checkbox
                    label="Show nonvarying parameters"
                    checked={showConstantParameters}
                    onChange={handleShowConstantParametersChange}
                />
                <ParametersSelector
                    allParameterIdents={intersectedParameterIdents}
                    selectedParameterIdents={selectedParameterIdents}
                    onChange={handleParameterIdentsChange}
                />
            </CollapsibleGroup>
        </div>
    );
}
