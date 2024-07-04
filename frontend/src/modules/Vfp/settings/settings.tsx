import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { DiscreteSlider } from "@lib/components/DiscreteSlider";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select } from "@lib/components/Select";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { Interface, State } from "../state";
import {
    userSelectedEnsembleIdentAtom,
    userSelectedRealizationNumberAtom,
    validRealizationNumbersAtom,
    userSelectedVfpTableNameAtom,
    validVfpTableNamesAtom,
} from "./atoms/baseAtoms";
import {
    selectedEnsembleIdentAtom,
    selectedRealizationNumberAtom,
    selectedVfpTableNameAtom,
    availableVfpTableNamesAtom,
    vfpTableDataAtom,
} from "./atoms/derivedAtoms";


export function Settings({ workbenchSession }: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const setUserSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);

    const selectedRealizationNumber = useAtomValue(selectedRealizationNumberAtom);
    const setUserSelectedRealizationNumber = useSetAtom(userSelectedRealizationNumberAtom);

    const selectedVfpTableName = useAtomValue(selectedVfpTableNameAtom)
    const setUserSelectedVfpName = useSetAtom(userSelectedVfpTableNameAtom)

    const setValidRealizationNumbersAtom = useSetAtom(validRealizationNumbersAtom);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);
    const validRealizations = selectedEnsembleIdent ? [...filterEnsembleRealizationsFunc(selectedEnsembleIdent)] : null;
    setValidRealizationNumbersAtom(validRealizations);

    const setValidVfpTableNamesAtom = useSetAtom(validVfpTableNamesAtom)
    const validVfpTableNames = useAtomValue(availableVfpTableNamesAtom);
    setValidVfpTableNamesAtom(validVfpTableNames)

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setUserSelectedEnsembleIdent(ensembleIdent);
    }

    function handleRealizationNumberChange(value: string) {
        const realizationNumber = parseInt(value);
        setUserSelectedRealizationNumber(realizationNumber);
    }

    function handleVfpNameSelectionChange(value: string) {
        const vfpName = value
        setUserSelectedVfpName(vfpName)
    }

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={selectedEnsembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Realization">
                <Dropdown
                    options={
                        validRealizations?.map((real) => {
                            return { value: real.toString(), label: real.toString() };
                        }) ?? []
                    }
                    value={selectedRealizationNumber?.toString() ?? undefined}
                    onChange={handleRealizationNumberChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="VFP Name">
                <Dropdown
                    options={
                        validVfpTableNames?.map((name) => {
                            return { value: name, label: name };
                        }) ?? []
                    }
                    value={selectedVfpTableName?.toString() ?? undefined}
                    onChange={handleVfpNameSelectionChange}
                />
            </CollapsibleGroup>
    </div>
    );
}