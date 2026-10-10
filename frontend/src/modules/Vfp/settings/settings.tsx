import { useAtom, useAtomValue } from "jotai";

import { VfpType_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItems } from "@lib/components/Combobox/types";
import { RadioCompositions } from "@lib/components/Radio/compositions";
import { Select, type SelectOption } from "@lib/components/Select";
import { Setting } from "@lib/components/Setting";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { propagateQueryErrorToStatusWriter } from "@modules/_shared/utils/propagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { PressureOption, VfpParam, VfpType } from "../types";
import type { VfpApiTableDataAccessor } from "../utils/vfpApiTableDataAccessor";

import { selectedPressureOptionAtom } from "./atoms/baseAtoms";
import {
    availableVfpTableNumbersAtom,
    availableVfpTypesAtom,
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
    selectedVfpTableNumberAtom,
    selectedVfpTypeAtom,
    selectedWfrIndicesAtom,
} from "./atoms/persistableFixableAtoms";
import { vfpTablesQueryAtom, vfpTableQueryAtom } from "./atoms/queryAtoms";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const statusWriter = useSettingsStatusWriter(settingsContext);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const vfpTableQuery = useAtomValue(vfpTableQueryAtom);
    const vfpTablesQuery = useAtomValue(vfpTablesQueryAtom);

    const vfpDataAccessorWithStatus = useAtomValue(tableDataAccessorWithStatusFlagsAtom);
    const vfpDataAccessor = vfpDataAccessorWithStatus.tableDataAccessor;

    const [userSelectedPressureOption, setUserSelectedPressureOption] = useAtom(selectedPressureOptionAtom);

    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [selectedRealizationNumber, setSelectedRealizationNumber] = useAtom(selectedRealizationNumberAtom);
    const [selectedVfpType, setSelectedVfpType] = useAtom(selectedVfpTypeAtom);
    const [selectedVfpTableNumber, setSelectedVfpTableNumber] = useAtom(selectedVfpTableNumberAtom);
    const [selectedThpIndices, setSelectedThpIndices] = useAtom(selectedThpIndicesAtom);
    const [selectedWfrIndices, setSelectedWfrIndices] = useAtom(selectedWfrIndicesAtom);
    const [selectedGfrIndices, setSelectedGfrIndices] = useAtom(selectedGfrIndicesAtom);
    const [selectedAlqIndices, setSelectedAlqIndices] = useAtom(selectedAlqIndicesAtom);
    const [selectedColorBy, setSelectedColorBy] = useAtom(selectedColorByAtom);

    const availableRealizationNumbers = useAtomValue(availableRealizationNumbersAtom);
    const availableVfpTypes = useAtomValue(availableVfpTypesAtom);
    const availableVfpTableNumbers = useAtomValue(availableVfpTableNumbersAtom);

    propagateQueryErrorToStatusWriter(vfpTableQuery, statusWriter);
    propagateQueryErrorToStatusWriter(vfpTablesQuery, statusWriter);

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
    const selectedVfpTypeAnnotations = useMakePersistableFixableAtomAnnotations(selectedVfpTypeAtom);
    const selectedVfpTableNumberAnnotations = useMakePersistableFixableAtomAnnotations(selectedVfpTableNumberAtom);
    const selectedThpIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedThpIndicesAtom);
    const selectedWfrIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedWfrIndicesAtom);
    const selectedGfrIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedGfrIndicesAtom);
    const selectedAlqIndicesAnnotations = useMakePersistableFixableAtomAnnotations(selectedAlqIndicesAtom);
    const selectedColorByAnnotations = useMakePersistableFixableAtomAnnotations(selectedColorByAtom);

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Data" defaultOpen>
                    <Setting.Field label="Ensemble" annotations={selectedEnsembleIdentAnnotations}>
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={selectedEnsembleIdent.value}
                            ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(workbenchSession)}
                            onValueChange={setSelectedEnsembleIdent}
                        />
                    </Setting.Field>
                    <Setting.Field label="Realization" annotations={selectedRealizationNumberAnnotations}>
                        <Combobox<number>
                            items={availableRealizationNumbers.map((real) => {
                                return { value: real, label: real.toString() };
                            })}
                            value={selectedRealizationNumber.value}
                            onValueChange={setSelectedRealizationNumber}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="VFP Type"
                        annotations={selectedVfpTypeAnnotations}
                        loadingOverlay={selectedVfpType.isLoading}
                        errorOverlay={
                            selectedVfpType.depsHaveError
                                ? "Error loading VFP tables. See log for details."
                                : undefined
                        }
                    >
                        <RadioCompositions.GroupWithLabels
                            value={selectedVfpType.value}
                            options={[
                                { label: "Production", value: VfpType_api.PROD },
                                { label: "Injection", value: VfpType_api.INJ },
                            ]}
                            onValueChange={(value) => setSelectedVfpType(value as VfpType_api)}
                            // Disable only when current selection is valid,
                            // such that the user can switch away from an invalid persisted type.
                            disabled={availableVfpTypes.length < 2 && selectedVfpType.isValidInContext}
                            layout="horizontal"
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="VFP Table Number"
                        annotations={selectedVfpTableNumberAnnotations}
                        loadingOverlay={selectedVfpTableNumber.isLoading}
                        errorOverlay={
                            selectedVfpTableNumber.depsHaveError
                                ? "Error loading table numbers. See log for details."
                                : undefined
                        }
                    >
                        <Combobox<number>
                            items={availableVfpTableNumbers.map((tableNumber) => {
                                return { value: tableNumber, label: tableNumber.toString() };
                            })}
                            value={selectedVfpTableNumber.value}
                            onValueChange={setSelectedVfpTableNumber}
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Plot" defaultOpen>
                    <Setting.Field label="Pressure Option">
                        <RadioCompositions.GroupWithLabels
                            value={userSelectedPressureOption}
                            options={[
                                { label: "BHP", value: PressureOption.BHP },
                                { label: "DP (BHP-THP)", value: PressureOption.DP },
                            ]}
                            onValueChange={setUserSelectedPressureOption}
                            layout="horizontal"
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Color By"
                        annotations={selectedColorByAnnotations}
                        loadingOverlay={selectedColorBy.isLoading}
                        errorOverlay={
                            selectedColorBy.depsHaveError
                                ? "Error loading VFP parameter values. See log for details."
                                : undefined
                        }
                    >
                        <Combobox
                            items={makeColorByItems(vfpType, vfpDataAccessor)}
                            value={selectedColorBy.value}
                            onValueChange={(v) => v && setSelectedColorBy(v)}
                        />
                    </Setting.Field>
                    <Setting.Field
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
                            onValueChange={handleThpIndicesSelectionChange}
                            size={5}
                            multiple
                            showQuickSelectButtons
                        />
                    </Setting.Field>
                    <Setting.Field
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
                            onValueChange={handleWfrIndicesSelectionChange}
                            size={5}
                            multiple
                            showQuickSelectButtons
                        />
                    </Setting.Field>
                    <Setting.Field
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
                            onValueChange={handleGfrIndicesSelectionChange}
                            size={5}
                            multiple
                            showQuickSelectButtons
                        />
                    </Setting.Field>
                    <Setting.Field
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
                            onValueChange={handleAlqIndicesSelectionChange}
                            size={3}
                            multiple
                            showQuickSelectButtons
                        />
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}

function makeFilterOptions(values: number[] | undefined): SelectOption<string>[] {
    return values?.map((value, index) => ({ label: value.toString(), value: index.toString() })) ?? [];
}

function makeColorByItems(
    vfpType: VfpType | null,
    vfpDataAccessor: VfpApiTableDataAccessor | null,
): ComboboxItems<VfpParam> {
    const items = [{ label: vfpDataAccessor?.getVfpParamLabel(VfpParam.THP, false) ?? "THP", value: VfpParam.THP }];
    if (vfpType === VfpType.VFPPROD) {
        items.push(
            ...[
                { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.WFR, false) ?? "WFR", value: VfpParam.WFR },
                { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.GFR, false) ?? "GFR", value: VfpParam.GFR },
                { label: vfpDataAccessor?.getVfpParamLabel(VfpParam.ALQ, false) ?? "ALQ", value: VfpParam.ALQ },
            ],
        );
    }
    return items;
}
