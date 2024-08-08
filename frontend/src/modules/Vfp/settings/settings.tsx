import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { RadioGroup } from "@lib/components/RadioGroup";
import { PressureOption } from "../types";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { Interface, State } from "../state";
import {
    userSelectedEnsembleIdentAtom,
    userSelectedRealizationNumberAtom,
    validRealizationNumbersAtom,
    userSelectedVfpTableNameAtom,
    validVfpTableNamesAtom,
    userSelectedThpIndicesAtom,
    userSelectedWfrIndicesAtom,
    userSelectedGfrIndicesAtom,
    userSelectedAlqIndicesAtom,
    userSelectedPressureOptionAtom,
} from "./atoms/baseAtoms";
import {
    selectedEnsembleIdentAtom,
    selectedRealizationNumberAtom,
    selectedVfpTableNameAtom,
    availableVfpTableNamesAtom,
    vfpTableDataAtom,
    selectedThpIndicesAtom,
    selectedWfrIndicesAtom,
    selectedGfrIndicesAtom,
    selectedAlqIndicesAtom,
    selectedPressureOptionAtom,
} from "./atoms/derivedAtoms";


export function Settings({ workbenchSession }: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    const vfpTable =useAtomValue(vfpTableDataAtom)

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

    const selectedThpIndicies = useAtomValue(selectedThpIndicesAtom);
    const setUserSelectedThpIndices = useSetAtom(userSelectedThpIndicesAtom);

    const selectedWfrIndicies = useAtomValue(selectedWfrIndicesAtom);
    const setUserSelectedWfrIndices = useSetAtom(userSelectedWfrIndicesAtom);

    const selectedGfrIndicies = useAtomValue(selectedGfrIndicesAtom);
    const setUserSelectedGfrIndices = useSetAtom(userSelectedGfrIndicesAtom);

    const selectedAlqIndicies = useAtomValue(selectedAlqIndicesAtom);
    const setUserSelectedAlqIndices = useSetAtom(userSelectedAlqIndicesAtom);

    const selectedPressureOption = useAtomValue(selectedPressureOptionAtom);
    const setUserSelectedPressureOption = useSetAtom(userSelectedPressureOptionAtom)

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

    function handleThpIndicesSelectionChange(thpIndices: string[]) {
        const thpIndicesNumbers = thpIndices.map((value) => parseInt(value))
        setUserSelectedThpIndices(thpIndicesNumbers)
    }

    function handleWfrIndicesSelectionChange(wfrIndices: string[]) {
        const wfrIndicesNumbers = wfrIndices.map((value) => parseInt(value))
        setUserSelectedWfrIndices(wfrIndicesNumbers)
    }

    function handleGfrIndicesSelectionChange(gfrIndices: string[]) {
        const gfrIndicesNumbers = gfrIndices.map((value) => parseInt(value))
        setUserSelectedGfrIndices(gfrIndicesNumbers)
    }

    function handleAlqIndicesSelectionChange(alqIndices: string[]) {
        const alqIndicesNumbers = alqIndices.map((value) => parseInt(value))
        setUserSelectedAlqIndices(alqIndicesNumbers)
    }

    function handlePressureOptionChange(_: React.ChangeEvent<HTMLInputElement>, pressureOption: PressureOption) {
        setUserSelectedPressureOption(pressureOption)
    }

    let thpTitle = "THP"
    let wfrTitle = "WFR"
    let gfrTitle = "GFR"
    let alqTitle = "ALQ"
    if (vfpTable !== undefined) {
        wfrTitle = vfpTable.wfr_type
        gfrTitle = vfpTable.gfr_type
        alqTitle += ": " + vfpTable.alq_type
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
                    value={selectedVfpTableName ?? undefined}
                    onChange={handleVfpNameSelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Filter" expanded={true}>
                <Label text={thpTitle}>
                    <Select
                        options={makeFilterOptions(vfpTable?.thp_values)}
                        value={selectedThpIndicies?.map((value) => value.toString()) ?? []}
                        onChange={handleThpIndicesSelectionChange}
                        size={5}
                        multiple={true}
                    />
                </Label>
                <Label text={wfrTitle} >
                    <Select
                        options={makeFilterOptions(vfpTable?.wfr_values)}
                        value={selectedWfrIndicies?.map((value) => value.toString()) ?? []}
                        onChange={handleWfrIndicesSelectionChange}
                        size={5}
                        multiple={true}
                    />
                </Label>
                <Label text={gfrTitle}>
                    <Select
                        options={makeFilterOptions(vfpTable?.gfr_values)}
                        value={selectedGfrIndicies?.map((value) => value.toString()) ?? []}
                        onChange={handleGfrIndicesSelectionChange}
                        size={5}
                        multiple={true}
                    />
                </Label>
                <Label text={alqTitle}>
                    <Select
                        options={makeFilterOptions(vfpTable?.alq_values)}
                        value={selectedAlqIndicies?.map((value) => value.toString()) ?? []}
                        onChange={handleAlqIndicesSelectionChange}
                        size={5}
                        multiple={true}
                    />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup title="Pressure Option" expanded={true}>
                <RadioGroup
                    options={[
                        { label: "BHP", value: PressureOption.BHP },
                        { label: "DP (BHP-THP)", value: PressureOption.DP },
                    ]}
                    value={selectedPressureOption}
                    onChange={handlePressureOptionChange}
                />
            </CollapsibleGroup>

    </div>
    );
}

function makeFilterOptions(values: number[] | undefined): SelectOption[] {
    return values?.map((value, index) => ({ label: value.toString(), value: index.toString()})) ?? [];
}