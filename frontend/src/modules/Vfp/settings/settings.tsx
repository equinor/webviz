import { useAtom, useAtomValue } from "jotai";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { PersistableAtomWarningWrapper } from "@modules/_shared/components/PersistableAtomWarningWrapper";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { PressureOption, VfpParam, VfpType } from "../types";
import type { VfpApiDataAccessor } from "../utils/vfpApiDataAccessor";

import { selectedPressureOptionAtom } from "./atoms/baseAtoms";
import {
    availableVfpTableNamesAtom,
    availableRealizationNumbersAtom,
    vfpDataAccessorWithStatusAtom,
} from "./atoms/derivedAtoms";
import {
    selectedAlqIndicesAtom,
    selectedColorByAtom,
    selectedEnsembleIdentAtom,
    selectedGfrIndicesAtom,
    selectedRealizationNumberAtom,
    selectedThpIndicesAtom,
    selectedVfpTableNameAtom,
    selectedWfrIndicesAtom,
} from "./atoms/persistableFixableAtoms";
import { vfpTableQueryAtom } from "./atoms/queryAtoms";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const vfpTableQuery = useAtomValue(vfpTableQueryAtom);

    const vfpDataAccessorWithStatus = useAtomValue(vfpDataAccessorWithStatusAtom);
    const vfpDataAccessor = vfpDataAccessorWithStatus.vfpApiDataAccessor;

    const [userSelectedPressureOption, setUserSelectedPressureOption] = useAtom(selectedPressureOptionAtom);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [selectedRealizationNumber, setSelectedRealizationNumber] = useAtom(selectedRealizationNumberAtom);
    const [selectedVfpTableName, setSelectedVfpTableName] = useAtom(selectedVfpTableNameAtom);
    const [selectedThpIndices, setSelectedThpIndices] = useAtom(selectedThpIndicesAtom);
    const [selectedWfrIndices, setSelectedWfrIndices] = useAtom(selectedWfrIndicesAtom);
    const [selectedGfrIndices, setSelectedGfrIndices] = useAtom(selectedGfrIndicesAtom);
    const [selectedAlqIndices, setSelectedAlqIndices] = useAtom(selectedAlqIndicesAtom);
    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);

    const availableRealizationNumbers = useAtomValue(availableRealizationNumbersAtom);
    const validVfpTableNames = useAtomValue(availableVfpTableNamesAtom);

    usePropagateQueryErrorToStatusWriter(vfpTableQuery, statusWriter);

    function handleEnsembleSelectionChange(ensembleIdent: RegularEnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }

    function handleRealizationNumberChange(value: string) {
        const realizationNumber = parseInt(value);
        setSelectedRealizationNumber(realizationNumber);
    }

    function handleVfpNameSelectionChange(value: string) {
        const vfpName = value;
        setSelectedVfpTableName(vfpName);
    }

    function handleThpIndicesSelectionChange(thpIndices: string[]) {
        const thpIndicesNumbers = thpIndices.map((value) => parseInt(value));
        setSelectedThpIndices(thpIndicesNumbers);
    }

    function handleWfrIndicesSelectionChange(wfrIndices: string[]) {
        const wfrIndicesNumbers = wfrIndices.map((value) => parseInt(value));
        setSelectedWfrIndices(wfrIndicesNumbers);
    }

    function handleGfrIndicesSelectionChange(gfrIndices: string[]) {
        const gfrIndicesNumbers = gfrIndices.map((value) => parseInt(value));
        setSelectedGfrIndices(gfrIndicesNumbers);
    }

    function handleAlqIndicesSelectionChange(alqIndices: string[]) {
        const alqIndicesNumbers = alqIndices.map((value) => parseInt(value));
        setSelectedAlqIndices(alqIndicesNumbers);
    }

    function handlePressureOptionChange(_: React.ChangeEvent<HTMLInputElement>, pressureOption: PressureOption) {
        setUserSelectedPressureOption(pressureOption);
    }

    function handleColorByChange(vfpParam: string) {
        setSelectedColorBy(vfpParam as VfpParam);
    }

    let thpLabel = "THP";
    let wfrLabel = "WFR";
    let gfrLabel = "GFR";
    let alqLabel = "ALQ";
    let vfpType: VfpType | null = null;
    if (vfpDataAccessor) {
        thpLabel = vfpDataAccessor.getVfpParamLabel(VfpParam.THP, true);
        vfpType = vfpDataAccessor.getVfpType();

        if (vfpDataAccessor.isProdTable()) {
            wfrLabel = vfpDataAccessor.getVfpParamLabel(VfpParam.WFR, true);
            gfrLabel = vfpDataAccessor.getVfpParamLabel(VfpParam.GFR, true);
            alqLabel = vfpDataAccessor.getVfpParamLabel(VfpParam.ALQ, true);
        }
    }

    const errorMessage = vfpTableQuery.isError ? "Error loading VFP Table data.\n See the log for details." : undefined;
    const infoMessage = vfpDataAccessor?.isInjTable() ? "Not available for VFP Injector tables" : undefined;

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <PersistableAtomWarningWrapper atom={selectedEnsembleIdentAtom}>
                    <EnsembleDropdown
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdent.value}
                        ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(workbenchSession)}
                        onChange={handleEnsembleSelectionChange}
                    />
                </PersistableAtomWarningWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Realization">
                <PersistableAtomWarningWrapper atom={selectedRealizationNumberAtom}>
                    <Dropdown
                        options={
                            availableRealizationNumbers?.map((real) => {
                                return { value: real.toString(), label: real.toString() };
                            }) ?? []
                        }
                        value={
                            selectedRealizationNumber.value !== null
                                ? selectedRealizationNumber.value.toString()
                                : undefined
                        }
                        onChange={handleRealizationNumberChange}
                    />
                </PersistableAtomWarningWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="VFP Name">
                <PersistableAtomWarningWrapper atom={selectedVfpTableNameAtom}>
                    <Dropdown
                        options={
                            validVfpTableNames?.map((name) => {
                                return { value: name, label: name };
                            }) ?? []
                        }
                        value={selectedVfpTableName.value ?? undefined}
                        onChange={handleVfpNameSelectionChange}
                    />
                </PersistableAtomWarningWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Filter" expanded={true}>
                <div className="flex flex-col gap-2">
                    <Label text={thpLabel}>
                        <PersistableAtomWarningWrapper atom={selectedThpIndicesAtom}>
                            <PendingWrapper isPending={vfpTableQuery.isFetching} errorMessage={errorMessage}>
                                <Select
                                    options={makeFilterOptions(vfpDataAccessor?.getVfpParamValues(VfpParam.THP))}
                                    value={selectedThpIndices.value?.map((value) => value.toString()) ?? []}
                                    onChange={handleThpIndicesSelectionChange}
                                    size={5}
                                    multiple={true}
                                />
                            </PendingWrapper>
                        </PersistableAtomWarningWrapper>
                    </Label>
                    <Label text={wfrLabel}>
                        <PersistableAtomWarningWrapper atom={selectedWfrIndicesAtom}>
                            <PendingWrapper
                                isPending={vfpTableQuery.isFetching}
                                errorMessage={errorMessage}
                                infoMessage={infoMessage}
                            >
                                <Select
                                    options={
                                        !vfpDataAccessor || vfpDataAccessor?.isInjTable()
                                            ? []
                                            : makeFilterOptions(vfpDataAccessor.getVfpParamValues(VfpParam.WFR))
                                    }
                                    value={selectedWfrIndices.value?.map((value) => value.toString()) ?? []}
                                    onChange={handleWfrIndicesSelectionChange}
                                    size={5}
                                    multiple={true}
                                />
                            </PendingWrapper>
                        </PersistableAtomWarningWrapper>
                    </Label>
                    <Label text={gfrLabel}>
                        <PersistableAtomWarningWrapper atom={selectedGfrIndicesAtom}>
                            <PendingWrapper
                                isPending={vfpTableQuery.isFetching}
                                errorMessage={errorMessage}
                                infoMessage={infoMessage}
                            >
                                <Select
                                    options={
                                        !vfpDataAccessor || vfpDataAccessor?.isInjTable()
                                            ? []
                                            : makeFilterOptions(vfpDataAccessor.getVfpParamValues(VfpParam.GFR))
                                    }
                                    value={selectedGfrIndices.value?.map((value) => value.toString()) ?? []}
                                    onChange={handleGfrIndicesSelectionChange}
                                    size={5}
                                    multiple={true}
                                />
                            </PendingWrapper>
                        </PersistableAtomWarningWrapper>
                    </Label>
                    <Label text={alqLabel}>
                        <PersistableAtomWarningWrapper atom={selectedAlqIndicesAtom}>
                            <PendingWrapper
                                isPending={vfpTableQuery.isFetching}
                                errorMessage={errorMessage}
                                infoMessage={infoMessage}
                            >
                                <Select
                                    options={
                                        !vfpDataAccessor || vfpDataAccessor?.isInjTable()
                                            ? []
                                            : makeFilterOptions(vfpDataAccessor.getVfpParamValues(VfpParam.ALQ))
                                    }
                                    value={selectedAlqIndices.value?.map((value) => value.toString()) ?? []}
                                    onChange={handleAlqIndicesSelectionChange}
                                    size={3}
                                    multiple={true}
                                />
                            </PendingWrapper>
                        </PersistableAtomWarningWrapper>
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Pressure Option" expanded={true}>
                <RadioGroup
                    options={[
                        { label: "BHP", value: PressureOption.BHP },
                        { label: "DP (BHP-THP)", value: PressureOption.DP },
                    ]}
                    value={userSelectedPressureOption}
                    onChange={handlePressureOptionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Color By" expanded={true}>
                <PersistableAtomWarningWrapper atom={selectedColorByAtom}>
                    <Dropdown
                        options={makeColorByOptions(vfpType, vfpDataAccessor)}
                        value={selectedColorBy.value ?? undefined}
                        onChange={handleColorByChange}
                    />
                </PersistableAtomWarningWrapper>
            </CollapsibleGroup>
        </div>
    );
}

function makeFilterOptions(values: number[] | undefined): SelectOption[] {
    return values?.map((value, index) => ({ label: value.toString(), value: index.toString() })) ?? [];
}

function makeColorByOptions(vfpType: VfpType | null, vfpDataAccessor: VfpApiDataAccessor | null): SelectOption[] {
    const options = [{ label: vfpDataAccessor?.getVfpParamLabel(VfpParam.THP, false) ?? "THP", value: VfpParam.THP }];
    if (vfpType === VfpType.VFPPROD) {
        options.push(
            ...[
                { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.WFR, false) ?? "WFR", value: VfpParam.WFR },
                { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.GFR, false) ?? "GFR", value: VfpParam.GFR },
                { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.ALQ, false) ?? "ALQ", value: VfpParam.ALQ },
            ],
        );
    }
    return options;
}
