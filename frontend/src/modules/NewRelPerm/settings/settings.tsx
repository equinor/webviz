import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
    selectedColorByAtom,
    selectedVisualizationModeAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedRelPermCurveNamesAtom,
    userSelectedSatNumsAtom,
    userSelectedSaturationAxisAtom,
    userSelectedTableNameAtom,
    validRealizationNumbersAtom,
} from "./atoms/baseAtoms";
import {
    availableRelPermCurveNamesAtom,
    availableRelPermSaturationAxesAtom,
    availableRelPermTableNamesAtom,
    availableSatNumsAtom,
    selectedEnsembleIdentAtom,
    selectedRelPermCurveNamesAtom,
    selectedRelPermSaturationAxisAtom,
    selectedRelPermTableNameAtom,
    selectedSatNumsAtom,
} from "./atoms/derivedAtoms";
import { relPermTableInfoQueryAtom, relPermTableNamesQueryAtom } from "./atoms/queryAtoms";

import { Interfaces } from "../interfaces";
import { ColorBy, VisualizationMode } from "../typesAndEnums";

//Helpers to populate dropdowns
const stringToOptions = (strings: string[]): SelectOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
};

export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const setUserSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const setValidRealizationNumbersAtom = useSetAtom(validRealizationNumbersAtom);
    const validRealizations = selectedEnsembleIdent ? [...filterEnsembleRealizationsFunc(selectedEnsembleIdent)] : null;
    setValidRealizationNumbersAtom(validRealizations);

    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);
    const [selectedVisualizationMode, setSelectedVisualizationMode] = useAtom(selectedVisualizationModeAtom);
    const relPermTableNamesQuery = useAtomValue(relPermTableNamesQueryAtom);
    const relPermTableInfoQuery = useAtomValue(relPermTableInfoQueryAtom);
    const availableRelPermTableNames = useAtomValue(availableRelPermTableNamesAtom);
    const selecedRelPermTableName = useAtomValue(selectedRelPermTableNameAtom);
    const setUserSelectedRelPermTableName = useSetAtom(userSelectedTableNameAtom);

    const availableRelPermSaturationAxes = useAtomValue(availableRelPermSaturationAxesAtom);
    const selectedRelPermSaturationAxis = useAtomValue(selectedRelPermSaturationAxisAtom);
    const setUserSelectedRelPermSaturationAxis = useSetAtom(userSelectedSaturationAxisAtom);

    const availableRelPermCurveNames = useAtomValue(availableRelPermCurveNamesAtom);
    const selectedRelPermCurveNames = useAtomValue(selectedRelPermCurveNamesAtom);
    const setUserSelectedRelPermCurveNames = useSetAtom(userSelectedRelPermCurveNamesAtom);

    const availableSatNums = useAtomValue(availableSatNumsAtom);
    const selectedSatNums = useAtomValue(selectedSatNumsAtom);
    const setUserSelectedSatNums = useSetAtom(userSelectedSatNumsAtom);

    const relPermTableNamesQueryErrorMessage =
        usePropagateApiErrorToStatusWriter(relPermTableNamesQuery, statusWriter) ?? "";
    const relPermTableInfoQueryErrorMessage =
        usePropagateApiErrorToStatusWriter(relPermTableInfoQuery, statusWriter) ?? "";

    function handleEnsembleSelectionChange(ensembleIdent: RegularEnsembleIdent | null) {
        setUserSelectedEnsembleIdent(ensembleIdent);
    }

    const [selectedMultiSatNums, setSelectedMultiSatNums] = React.useState<number[]>(selectedSatNums);

    function handleSatNumsChange(values: string[]) {
        const newSatNums = values.map((value) => parseInt(value) as number);
        setUserSelectedSatNums(newSatNums);
        setSelectedMultiSatNums(newSatNums);
    }
    function handleColorByChange(_: React.ChangeEvent<HTMLInputElement>, colorBy: ColorBy) {
        setSelectedColorBy(colorBy);
        if (colorBy === ColorBy.SATNUM) {
            setUserSelectedSatNums(selectedMultiSatNums);
        } else {
            setUserSelectedSatNums([selectedMultiSatNums[0]]);
        }

        //     setSelectedEnsembleIdents([selectedMultiEnsembleIdents[0]]);
        //     setSelectedRealizations([selectedMultiRealizations[0]]);
        //     setSelectedPvtNums(selectedMultiPvtNums);
        // } else {
        //     setSelectedEnsembleIdents(selectedMultiEnsembleIdents);
        //     setSelectedRealizations(selectedMultiRealizations);
        //     setSelectedPvtNums([selectedMultiPvtNums[0]]);
        // }
    }
    function handleVisualizationModeChange(
        _: React.ChangeEvent<HTMLInputElement>,
        visualizationMode: VisualizationMode,
    ) {
        setSelectedVisualizationMode(visualizationMode);
    }

    return (
        <div>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <EnsembleDropdown
                    ensembles={ensembleSet.getRegularEnsembleArray()}
                    value={selectedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </CollapsibleGroup>
            <PendingWrapper
                isPending={relPermTableNamesQuery.isFetching}
                errorMessage={relPermTableNamesQueryErrorMessage}
            >
                <CollapsibleGroup expanded={true} title="Table name">
                    <Dropdown
                        options={stringToOptions(availableRelPermTableNames)}
                        value={selecedRelPermTableName ?? ""}
                        onChange={setUserSelectedRelPermTableName}
                    />
                </CollapsibleGroup>
            </PendingWrapper>
            <PendingWrapper
                isPending={relPermTableInfoQuery.isFetching}
                errorMessage={relPermTableInfoQueryErrorMessage}
            >
                <CollapsibleGroup expanded={true} title="Saturation axis">
                    <Dropdown
                        options={stringToOptions(availableRelPermSaturationAxes)}
                        value={selectedRelPermSaturationAxis ?? ""}
                        onChange={setUserSelectedRelPermSaturationAxis}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Color by">
                    <RadioGroup
                        options={[
                            { label: "Ensemble", value: ColorBy.ENSEMBLE },
                            { label: "Curve", value: ColorBy.CURVE },
                            { label: "Satnum", value: ColorBy.SATNUM },
                        ]}
                        value={selectedColorBy}
                        onChange={handleColorByChange}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Curves">
                    <Select
                        options={stringToOptions(availableRelPermCurveNames)}
                        value={selectedRelPermCurveNames ?? []}
                        onChange={setUserSelectedRelPermCurveNames}
                        size={3}
                        multiple
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Satnums">
                    <Select
                        options={stringToOptions(availableSatNums.map((num) => num.toString()))}
                        value={selectedSatNums ? selectedSatNums.map((num) => num.toString()) : []}
                        onChange={handleSatNumsChange}
                        size={10}
                        multiple={selectedColorBy === ColorBy.SATNUM}
                    />
                </CollapsibleGroup>
                <CollapsibleGroup expanded={true} title="Visualization type">
                    <RadioGroup
                        options={[
                            { label: "Statistical Fanchart", value: VisualizationMode.STATISTICAL_FANCHART },
                            { label: "Individual Realizations", value: VisualizationMode.INDIVIDUAL_REALIZATIONS },
                        ]}
                        value={selectedVisualizationMode}
                        onChange={handleVisualizationModeChange}
                    />
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}
