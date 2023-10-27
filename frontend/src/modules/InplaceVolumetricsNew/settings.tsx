import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet, useIsEnsembleSetLoading } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { LoadingStateWrapper } from "@lib/components/StateWrapper/stateWrapper";
import { FilterAlt } from "@mui/icons-material";

import { useTableNameAndMetadataFilterOptions } from "./hooks/useTableNameAndMetadataFilterOptions";
import { useTableNamesAndMetadata } from "./hooks/useTableNamesAndMetadata";
import { State } from "./state";

export const settings = ({ workbenchSession, moduleContext }: ModuleFCProps<State>) => {
    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = React.useState<EnsembleIdent[]>([]);
    const isEnsembleSetLoading = useIsEnsembleSetLoading(workbenchSession);
    const ensembleSet = useEnsembleSet(workbenchSession);

    const stateWriter = useSettingsStatusWriter(moduleContext);

    const tableNamesAndMetadata = useTableNamesAndMetadata(selectedEnsembleIdents);
    const filterOptions = useTableNameAndMetadataFilterOptions(tableNamesAndMetadata);

    function handleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
    }

    function makeCategoricalSelect(categoryName: string, options: (string | number)[]) {
        const selectOptions = options.map((option) => ({ value: `${option}`, label: `${option}` }));
        return (
            <Label text={categoryName}>
                <Select options={selectOptions} size={5} />
            </Label>
        );
    }

    const fluidZoneOptions =
        filterOptions?.fluidZones.map((fluidZone) => ({ value: fluidZone, label: fluidZone })) ?? [];
    const sourceOptions = filterOptions?.sources.map((source) => ({ value: source, label: source })) ?? [];

    return (
        <div className="w-full h-full flex flex-col gap-4">
            <CollapsibleGroup title="Filter" icon={<FilterAlt fontSize="small" />}>
                <div className="flex flex-col gap-2">
                    <Label text="Ensemble">
                        <LoadingStateWrapper isLoading={isEnsembleSetLoading} loadingComponent={<CircularProgress />}>
                            <MultiEnsembleSelect
                                ensembleSet={ensembleSet}
                                value={selectedEnsembleIdents}
                                onChange={handleEnsembleSelectionChange}
                                size={5}
                                filter
                            />
                        </LoadingStateWrapper>
                    </Label>
                    <LoadingStateWrapper
                        isLoading={tableNamesAndMetadata.isFetching}
                        loadingComponent={<CircularProgress />}
                        className="flex flex-col gap-2"
                    >
                        <Label text="Fluid zone">
                            <Select options={fluidZoneOptions} size={2} />
                        </Label>
                        <Label text="Source">
                            <Select options={sourceOptions} size={2} />
                        </Label>
                        {filterOptions &&
                            Object.entries(filterOptions.categories).map(([category, values]) =>
                                makeCategoricalSelect(category, values)
                            )}
                    </LoadingStateWrapper>
                </div>
            </CollapsibleGroup>
        </div>
    );
};
