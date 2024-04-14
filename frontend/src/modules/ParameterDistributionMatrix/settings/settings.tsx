import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
    showConstantParametersAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedParameterIdentsAtom,
} from "./atoms/baseAtoms";
import {
    intersectedParameterIdentsAtom,
    selectedEnsembleIdentsAtom,
    selectedParameterIdentsAtom,
} from "./atoms/derivedAtoms";

import { Interface } from "../settingstoViewInterface";
import { State } from "../state";

const MAX_PARAMETERS = 50;
export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);

    const setSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);

    const intersectedParameterIdents = useAtomValue(intersectedParameterIdentsAtom);
    const setSelectedParameterIdents = useSetAtom(userSelectedParameterIdentsAtom);
    const selectedParameterIdents = useAtomValue(selectedParameterIdentsAtom);
    const [showConstantParameters, setShowConstantParameters] = useAtom(showConstantParametersAtom);
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

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Ensembles" expanded>
                <EnsembleSelect
                    ensembleSet={ensembleSet}
                    onChange={handleEnsembleSelectionChange}
                    value={selectedEnsembleIdents}
                    size={5}
                    multiple
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
                    multiple
                    options={makeParameterIdentsOptions(intersectedParameterIdents)}
                    value={selectedParameterIdents.map((parameterIdent) => parameterIdent.toString())}
                    onChange={handleParameterIdentsChange}
                    size={20}
                    filter
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
