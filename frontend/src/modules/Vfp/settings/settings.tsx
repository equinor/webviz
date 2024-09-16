import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue, useSetAtom } from "jotai";

import {
    userSelectedAlqIndicesAtom,
    userSelectedColorByAtom,
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
    selectedColorByAtom,
    selectedEnsembleIdentAtom,
    selectedGfrIndicesAtom,
    selectedPressureOptionAtom,
    selectedRealizationNumberAtom,
    selectedThpIndicesAtom,
    selectedVfpTableNameAtom,
    selectedWfrIndicesAtom,
} from "./atoms/derivedAtoms";
import { vfpTableQueryAtom } from "./atoms/queryAtoms";

import { Interfaces } from "../interfaces";
import { PressureOption, VfpParam } from "../types";
import { VfpDataAccessor } from "../utils/VfpDataAccessor";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
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

    const selectedColorBy = useAtomValue(selectedColorByAtom);
    const setUserSelectedColorBy = useSetAtom(userSelectedColorByAtom)

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

    function handleColorByChange(vfpParam: string) {
        setUserSelectedColorBy(vfpParam as VfpParam);
    }

    let thpLabel = "THP";
    let wfrLabel = "WFR";
    let gfrLabel = "GFR";
    let alqLabel = "ALQ";
    const vfpTableData = vfpTableQuery?.data;
    let vfpDataAccessor;
    if (vfpTableData) {
        vfpDataAccessor = new VfpDataAccessor(vfpTableData)
        thpLabel = vfpDataAccessor.getVfpParamLabel(VfpParam.THP, true)
        wfrLabel = vfpDataAccessor.getVfpParamLabel(VfpParam.WFR, true)
        gfrLabel = vfpDataAccessor.getVfpParamLabel(VfpParam.GFR, true)
        alqLabel = vfpDataAccessor.getVfpParamLabel(VfpParam.ALQ, true)
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
                    <div className="flex flex-col gap-2">
                        <Label text={thpLabel}>
                            <Select
                                options={makeFilterOptions(vfpDataAccessor?.getVfpParamValues(VfpParam.THP))}
                                value={selectedThpIndicies?.map((value) => value.toString()) ?? []}
                                onChange={handleThpIndicesSelectionChange}
                                size={Math.min(5, vfpDataAccessor?.getNumberOfValues(VfpParam.THP) ?? 5)}
                                multiple={true}
                            />
                        </Label>
                        <Label text={wfrLabel}>
                            <Select
                                options={makeFilterOptions(vfpDataAccessor?.getVfpParamValues(VfpParam.WFR))}
                                value={selectedWfrIndicies?.map((value) => value.toString()) ?? []}
                                onChange={handleWfrIndicesSelectionChange}
                                size={Math.min(5, vfpDataAccessor?.getNumberOfValues(VfpParam.WFR) ?? 5)}
                                multiple={true}
                            />
                        </Label>
                        <Label text={gfrLabel}>
                            <Select
                                options={makeFilterOptions(vfpDataAccessor?.getVfpParamValues(VfpParam.GFR))}
                                value={selectedGfrIndicies?.map((value) => value.toString()) ?? []}
                                onChange={handleGfrIndicesSelectionChange}
                                size={Math.min(5, vfpDataAccessor?.getNumberOfValues(VfpParam.GFR) ?? 5)}
                                multiple={true}
                            />
                        </Label>
                        <Label text={alqLabel}>
                            <Select
                                options={makeFilterOptions(vfpDataAccessor?.getVfpParamValues(VfpParam.ALQ))}
                                value={selectedAlqIndicies?.map((value) => value.toString()) ?? []}
                                onChange={handleAlqIndicesSelectionChange}
                                size={Math.min(5, vfpDataAccessor?.getNumberOfValues(VfpParam.ALQ) ?? 5)}
                                multiple={true}
                            />
                        </Label>
                    </div>
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
            <CollapsibleGroup title="Color By" expanded={true}>
                <Dropdown
                    options={[
                        { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.THP, false) ?? "THP", value: VfpParam.THP },
                        { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.WFR, false) ?? "WFR", value: VfpParam.WFR },
                        { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.GFR, false) ?? "GFR", value: VfpParam.GFR },
                        { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.ALQ, false) ?? "ALQ", value: VfpParam.ALQ },
                    ]}
                    value={selectedColorBy ?? undefined}
                    onChange={handleColorByChange}
                />
            </CollapsibleGroup>
        </div>
    );
}

function makeFilterOptions(values: number[] | undefined): SelectOption[] {
    return values?.map((value, index) => ({ label: value.toString(), value: index.toString() })) ?? [];
}
