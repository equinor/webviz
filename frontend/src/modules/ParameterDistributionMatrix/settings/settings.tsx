import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

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

import { Interfaces } from "../interfaces";
import {
    MAX_PARAMETERS,
    ParameterDistributionPlotType,
    ParameterDistributionPlotTypeEnumToStringMapping,
} from "../typesAndEnums";

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
        showIndividualRealizationValuesAtom
    );
    const [showPercentilesAndMeanLines, setShowPercentilesAndMeanLines] = useAtom(showPercentilesAndMeanLinesAtom);

    function handleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function handleParameterIdentsChange(parameterIdentStrings: string[]) {
        const parameterIdents = parameterIdentStrings.map((parameterIdentString) =>
            ParameterIdent.fromString(parameterIdentString)
        );
        setSelectedParameterIdents(parameterIdents.slice(0, MAX_PARAMETERS));
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
                    ensembleSet={ensembleSet}
                    onChange={handleEnsembleSelectionChange}
                    value={selectedEnsembleIdents}
                    size={5}
                    multiple={true}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Parameters" expanded>
                <Checkbox
                    label="Show nonvarying parameters"
                    checked={showConstantParameters}
                    onChange={handleShowConstantParametersChange}
                />
                {`${MAX_PARAMETERS} parameters max`}
                <Select
                    multiple={true}
                    options={makeParameterIdentsOptions(intersectedParameterIdents)}
                    value={selectedParameterIdents.map((parameterIdent) => parameterIdent.toString())}
                    onChange={handleParameterIdentsChange}
                    size={20}
                    filter={true}
                ></Select>
            </CollapsibleGroup>
        </div>
    );
}

function makeParameterIdentsOptions(parameterIdents: ParameterIdent[]): SelectOption[] {
    return parameterIdents.map((ident) => ({
        value: ident.toString(),
        label: ident.groupName ? `${ident.groupName}:${ident.name}` : ident.name,
    }));
}
