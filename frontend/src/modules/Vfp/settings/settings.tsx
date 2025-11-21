import { useAtom, useAtomValue } from "jotai";

import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { RadioGroup } from "@lib/components/RadioGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { PressureOption, VfpParam, VfpType } from "../types";
import type { VfpApiTableDataAccessor } from "../utils/vfpApiTableDataAccessor";

import { selectedPressureOptionAtom } from "./atoms/baseAtoms";
import {
    availableVfpTableNamesAtom,
    availableRealizationNumbersAtom,
    tableDataAccessorWithStatusFlagsAtom,
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
import { vfpTableNamesQueryAtom, vfpTableQueryAtom } from "./atoms/queryAtoms";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const vfpTableQuery = useAtomValue(vfpTableQueryAtom);
    const vfpTableNamesQuery = useAtomValue(vfpTableNamesQueryAtom);

    const vfpDataAccessorWithStatus = useAtomValue(tableDataAccessorWithStatusFlagsAtom);
    const vfpDataAccessor = vfpDataAccessorWithStatus.tableDataAccessor;

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
    usePropagateQueryErrorToStatusWriter(vfpTableNamesQuery, statusWriter);

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

    const tableDataInfoMessage = vfpDataAccessor?.isInjTable() ? "Not available for VFP Injector tables" : undefined;

    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);
    const selectedRealizationNumberAnnotations =
        useMakePersistableFixableAtomAnnotations(selectedRealizationNumberAtom);
    const selectedVfpTableNameAnnotations = useMakePersistableFixableAtomAnnotations(selectedVfpTableNameAtom);
    const selectedThpIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedThpIndicesAtom);
    const selectedWfrIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedWfrIndicesAtom);
    const selectedGfrIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedGfrIndicesAtom);
    const selectedAlqIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedAlqIndicesAtom);
    const selectedColorByAnnotations = useMakePersistableFixableAtomAnnotations(selectedColorByAtom);

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup expanded={true} title="Ensemble">
                <SettingWrapper annotations={selectedEnsembleIdentAnnotations}>
                    <EnsembleDropdown
                        ensembles={ensembleSet.getRegularEnsembleArray()}
                        value={selectedEnsembleIdent.value}
                        ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(workbenchSession)}
                        onChange={handleEnsembleSelectionChange}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Realization">
                <SettingWrapper annotations={selectedRealizationNumberAnnotations}>
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
                </SettingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="VFP Name">
                <SettingWrapper
                    annotations={selectedVfpTableNameAnnotations}
                    loadingOverlay={selectedVfpTableName.isLoading}
                    errorOverlay={
                        selectedVfpTableName.depsHaveError
                            ? "Error loading table names. See log for details."
                            : undefined
                    }
                >
                    <Dropdown
                        options={
                            validVfpTableNames?.map((name) => {
                                return { value: name, label: name };
                            }) ?? []
                        }
                        value={selectedVfpTableName.value ?? undefined}
                        onChange={handleVfpNameSelectionChange}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Filter" expanded={true}>
                <div className="flex flex-col gap-2">
                    <SettingWrapper
                        label={thpLabel}
                        annotations={selectedThpIndicesAnnotations}
                        loadingOverlay={selectedThpIndices.isLoading}
                        errorOverlay={
                            selectedThpIndices.depsHaveError
                                ? "Error loading THP values. See log for details."
                                : undefined
                        }
                    >
                        <Select
                            options={makeFilterOptions(vfpDataAccessor?.getVfpParamValues(VfpParam.THP))}
                            value={selectedThpIndices.value?.map((value) => value.toString()) ?? []}
                            onChange={handleThpIndicesSelectionChange}
                            size={5}
                            multiple={true}
                        />
                    </SettingWrapper>
                    <SettingWrapper
                        label={wfrLabel}
                        annotations={vfpDataAccessor?.isInjTable() ? undefined : selectedWfrIndicesAnnotations}
                        loadingOverlay={selectedWfrIndices.isLoading}
                        errorOverlay={
                            selectedWfrIndices.depsHaveError
                                ? "Error loading WFR values. See log for details."
                                : undefined
                        }
                        infoOverlay={tableDataInfoMessage}
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
                    </SettingWrapper>
                    <SettingWrapper
                        label={gfrLabel}
                        annotations={vfpDataAccessor?.isInjTable() ? undefined : selectedGfrIndicesAnnotations}
                        loadingOverlay={selectedGfrIndices.isLoading}
                        errorOverlay={
                            selectedGfrIndices.depsHaveError
                                ? "Error loading GFR values. See log for details."
                                : undefined
                        }
                        infoOverlay={tableDataInfoMessage}
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
                    </SettingWrapper>
                    <SettingWrapper
                        label={alqLabel}
                        annotations={vfpDataAccessor?.isInjTable() ? undefined : selectedAlqIndicesAnnotations}
                        loadingOverlay={selectedAlqIndices.isLoading}
                        errorOverlay={
                            selectedAlqIndices.depsHaveError
                                ? "Error loading ALQ values. See log for details."
                                : undefined
                        }
                        infoOverlay={tableDataInfoMessage}
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
                    </SettingWrapper>
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
                <SettingWrapper
                    annotations={selectedColorByAnnotations}
                    loadingOverlay={selectedColorBy.isLoading}
                    errorOverlay={
                        selectedColorBy.depsHaveError
                            ? "Error loading VFP parameter values. See log for details."
                            : undefined
                    }
                >
                    <Dropdown
                        options={makeColorByOptions(vfpType, vfpDataAccessor)}
                        value={selectedColorBy.value ?? undefined}
                        onChange={handleColorByChange}
                    />
                </SettingWrapper>
            </CollapsibleGroup>
        </div>
    );
}

function makeFilterOptions(values: number[] | undefined): SelectOption[] {
    return values?.map((value, index) => ({ label: value.toString(), value: index.toString() })) ?? [];
}

function makeColorByOptions(vfpType: VfpType | null, vfpDataAccessor: VfpApiTableDataAccessor | null): SelectOption[] {
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
