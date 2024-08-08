import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue, useSetAtom } from "jotai";

import {
    userSelectedAlqIndicesAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedGfrIndicesAtom,
    userSelectedPressureOptionAtom,
    userSelectedRealizationNumberAtom,
    userSelectedThpIndicesAtom,
    userSelectedVfpTableNameAtom,
    userSelectedWfrIndicesAtom,
    validRealizationNumbersAtom,
} from "./atoms/baseAtoms";
import {
    availableVfpTableNamesAtom,
    selectedAlqIndicesAtom,
    selectedEnsembleIdentAtom,
    selectedGfrIndicesAtom,
    selectedPressureOptionAtom,
    selectedRealizationNumberAtom,
    selectedThpIndicesAtom,
    selectedVfpTableNameAtom,
    selectedWfrIndicesAtom,
} from "./atoms/derivedAtoms";
import { vfpTableQueryAtom } from "./atoms/queryAtoms";

import { Interface, State } from "../state";
import { PressureOption } from "../types";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<State, Interface>) {
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const vfpTableQuery = useAtomValue(vfpTableQueryAtom);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const setUserSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);

    const selectedRealizationNumber = useAtomValue(selectedRealizationNumberAtom);
    const setUserSelectedRealizationNumber = useSetAtom(userSelectedRealizationNumberAtom);

    const selectedVfpTableName = useAtomValue(selectedVfpTableNameAtom);
    const setUserSelectedVfpName = useSetAtom(userSelectedVfpTableNameAtom);

    const setValidRealizationNumbersAtom = useSetAtom(validRealizationNumbersAtom);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);
    const validRealizations = selectedEnsembleIdent ? [...filterEnsembleRealizationsFunc(selectedEnsembleIdent)] : null;
    setValidRealizationNumbersAtom(validRealizations);

    const validVfpTableNames = useAtomValue(availableVfpTableNamesAtom);

    const selectedThpIndicies = useAtomValue(selectedThpIndicesAtom);
    const setUserSelectedThpIndices = useSetAtom(userSelectedThpIndicesAtom);

    const selectedWfrIndicies = useAtomValue(selectedWfrIndicesAtom);
    const setUserSelectedWfrIndices = useSetAtom(userSelectedWfrIndicesAtom);

    const selectedGfrIndicies = useAtomValue(selectedGfrIndicesAtom);
    const setUserSelectedGfrIndices = useSetAtom(userSelectedGfrIndicesAtom);

    const selectedAlqIndicies = useAtomValue(selectedAlqIndicesAtom);
    const setUserSelectedAlqIndices = useSetAtom(userSelectedAlqIndicesAtom);

    const selectedPressureOption = useAtomValue(selectedPressureOptionAtom);
    const setUserSelectedPressureOption = useSetAtom(userSelectedPressureOptionAtom);

    usePropagateApiErrorToStatusWriter(vfpTableQuery, statusWriter);

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setUserSelectedEnsembleIdent(ensembleIdent);
    }

    function handleRealizationNumberChange(value: string) {
        const realizationNumber = parseInt(value);
        setUserSelectedRealizationNumber(realizationNumber);
    }

    function handleVfpNameSelectionChange(value: string) {
        const vfpName = value;
        setUserSelectedVfpName(vfpName);
    }

    function handleThpIndicesSelectionChange(thpIndices: string[]) {
        const thpIndicesNumbers = thpIndices.map((value) => parseInt(value));
        setUserSelectedThpIndices(thpIndicesNumbers);
    }

    function handleWfrIndicesSelectionChange(wfrIndices: string[]) {
        const wfrIndicesNumbers = wfrIndices.map((value) => parseInt(value));
        setUserSelectedWfrIndices(wfrIndicesNumbers);
    }

    function handleGfrIndicesSelectionChange(gfrIndices: string[]) {
        const gfrIndicesNumbers = gfrIndices.map((value) => parseInt(value));
        setUserSelectedGfrIndices(gfrIndicesNumbers);
    }

    function handleAlqIndicesSelectionChange(alqIndices: string[]) {
        const alqIndicesNumbers = alqIndices.map((value) => parseInt(value));
        setUserSelectedAlqIndices(alqIndicesNumbers);
    }

    function handlePressureOptionChange(_: React.ChangeEvent<HTMLInputElement>, pressureOption: PressureOption) {
        setUserSelectedPressureOption(pressureOption);
    }

    const thpTitle = "THP";
    let wfrTitle = "WFR";
    let gfrTitle = "GFR";
    let alqTitle = "ALQ";
    const vfpTableData = vfpTableQuery?.data;
    if (vfpTableData) {
        wfrTitle = vfpTableData.wfr_type;
        gfrTitle = vfpTableData.gfr_type;
        alqTitle += ": " + vfpTableData.alq_type;
    }

    return (
        <div className="flex flex-col gap-2">
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
                <PendingWrapper isPending={vfpTableQuery.isFetching} errorMessage="Failed to load VFP table data">
                    <div className="flex flex-col gap-2">
                        <Label text={thpTitle}>
                            <Select
                                options={makeFilterOptions(vfpTableData?.thp_values)}
                                value={selectedThpIndicies?.map((value) => value.toString()) ?? []}
                                onChange={handleThpIndicesSelectionChange}
                                size={5}
                                multiple={true}
                            />
                        </Label>
                        <Label text={wfrTitle}>
                            <Select
                                options={makeFilterOptions(vfpTableData?.wfr_values)}
                                value={selectedWfrIndicies?.map((value) => value.toString()) ?? []}
                                onChange={handleWfrIndicesSelectionChange}
                                size={5}
                                multiple={true}
                            />
                        </Label>
                        <Label text={gfrTitle}>
                            <Select
                                options={makeFilterOptions(vfpTableData?.gfr_values)}
                                value={selectedGfrIndicies?.map((value) => value.toString()) ?? []}
                                onChange={handleGfrIndicesSelectionChange}
                                size={5}
                                multiple={true}
                            />
                        </Label>
                        <Label text={alqTitle}>
                            <Select
                                options={makeFilterOptions(vfpTableData?.alq_values)}
                                value={selectedAlqIndicies?.map((value) => value.toString()) ?? []}
                                onChange={handleAlqIndicesSelectionChange}
                                size={5}
                                multiple={true}
                            />
                        </Label>
                    </div>
                </PendingWrapper>
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
    return values?.map((value, index) => ({ label: value.toString(), value: index.toString() })) ?? [];
}
