import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet, useIsEnsembleSetLoading } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { RealizationPicker } from "@framework/components/RealizationPicker/realizationPicker";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { LoadingStateWrapper } from "@lib/components/StateWrapper/stateWrapper";
import { BubbleChart, FilterAlt } from "@mui/icons-material";

import FilterSelect from "./components/filterSelect";
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
        const stringifiedOptions = options.map((option) => `${option}`);
        return <FilterSelect key={categoryName} name={categoryName} options={stringifiedOptions} size={5} />;
    }

    return (
        <div className="w-full h-full flex flex-col gap-4">
            <CollapsibleGroup title="Volume response" icon={<BubbleChart fontSize="small" />} expanded>
                <FilterSelect name="Response" options={filterOptions?.responses || []} size={5} />
            </CollapsibleGroup>
            <CollapsibleGroup title="Filter" icon={<FilterAlt fontSize="small" />} expanded>
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
                        <FilterSelect name="Fluid zone" options={filterOptions?.fluidZones || []} size={2} />
                        <FilterSelect name="Source" options={filterOptions?.sources || []} size={2} />
                        {filterOptions &&
                            Object.entries(filterOptions.categories).map(([category, values]) =>
                                makeCategoricalSelect(category, values)
                            )}
                        <Label text="Realizations">
                            <RealizationPicker ensembleIdents={selectedEnsembleIdents} />
                        </Label>
                    </LoadingStateWrapper>
                </div>
            </CollapsibleGroup>
        </div>
    );
};
