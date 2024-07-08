import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { TagOption, TagPicker } from "@lib/components/TagPicker";
import { InplaceVolumetricsFilterComponent } from "@modules/_shared/components/InplaceVolumetricsFilterComponent";

import { useAtomValue, useSetAtom } from "jotai";

import {
    userSelectedAccumulationOptionsAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedFluidZonesAtom,
    userSelectedIdentifiersValuesAtom,
    userSelectedResultNameAtom,
    userSelectedTableNamesAtom,
} from "./atoms/baseAtoms";
import {
    selectedAccumulationOptionsAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNameAtom,
    selectedTableNamesAtom,
    tableDefinitionsAccessorAtom,
} from "./atoms/derivedAtoms";
import { tableDefinitionsQueryAtom } from "./atoms/queryAtoms";

import { SettingsToViewInterface } from "../settingsToViewInterface";

export function Settings(props: ModuleSettingsProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const tableDefinitionsQueryResult = useAtomValue(tableDefinitionsQueryAtom);
    const tableDefinitionsAccessor = useAtomValue(tableDefinitionsAccessorAtom);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);

    const selectedTableNames = useAtomValue(selectedTableNamesAtom);
    const setSelectedTableNames = useSetAtom(userSelectedTableNamesAtom);

    const selectedFluidZones = useAtomValue(selectedFluidZonesAtom);
    const setSelectedFluidZones = useSetAtom(userSelectedFluidZonesAtom);

    const selectedIdentifiersValues = useAtomValue(selectedIdentifiersValuesAtom);
    const setSelectedIdentifiersValues = useSetAtom(userSelectedIdentifiersValuesAtom);

    const selectedResultName = useAtomValue(selectedResultNameAtom);
    const setSelectedResultName = useSetAtom(userSelectedResultNameAtom);

    const selectedAccumulationOptions = useAtomValue(selectedAccumulationOptionsAtom);
    const setSelectedAccumulationOptions = useSetAtom(userSelectedAccumulationOptionsAtom);

    function handleFilterChange(newFilter: InplaceVolumetricsFilter) {
        setSelectedEnsembleIdents(newFilter.ensembleIdents);
        setSelectedTableNames(newFilter.tableNames);
        setSelectedFluidZones(newFilter.fluidZones);
        setSelectedIdentifiersValues(newFilter.identifiersValues);
    }

    function handleAccumulationChange(newAccumulation: string[]) {
        setSelectedAccumulationOptions(newAccumulation);
    }

    const resultNameOptions = tableDefinitionsAccessor
        .getUniqueResultNames()
        .map((name) => ({ label: name, value: name }));

    const accumulateOptions: TagOption<string>[] = [{ label: "Fluid zone", value: "fluidZone" }];
    for (const identifier of tableDefinitionsAccessor.getUniqueIdentifierValues()) {
        accumulateOptions.push({ label: identifier.identifier, value: identifier.identifier });
    }

    return (
        <div className="flex flex-col gap-2">
            <InplaceVolumetricsFilterComponent
                ensembleSet={ensembleSet}
                settingsContext={props.settingsContext}
                workbenchServices={props.workbenchServices}
                isPending={tableDefinitionsQueryResult.isLoading}
                availableFluidZones={tableDefinitionsAccessor.getUniqueFluidZones()}
                availableTableNames={tableDefinitionsAccessor.getUniqueTableNames()}
                availableIdentifiersWithValues={tableDefinitionsAccessor.getUniqueIdentifierValues()}
                selectedEnsembleIdents={selectedEnsembleIdents}
                selectedFluidZones={selectedFluidZones}
                selectedIdentifiersValues={selectedIdentifiersValues}
                selectedTableNames={selectedTableNames}
                onChange={handleFilterChange}
            />
            <CollapsibleGroup title="Result and grouping" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Result">
                        <Dropdown
                            value={selectedResultName ?? undefined}
                            options={resultNameOptions}
                            onChange={setSelectedResultName}
                        />
                    </Label>
                    <Label text="Accumulate by">
                        <TagPicker
                            value={selectedAccumulationOptions}
                            tags={accumulateOptions}
                            onChange={handleAccumulationChange}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
