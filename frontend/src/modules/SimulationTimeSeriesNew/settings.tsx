import React from "react";

import { Frequency_api, StatisticFunction_api, VectorDescription_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { VectorSelector } from "@lib/components/VectorSelector";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { createVectorSelectorDataFromVectors } from "@lib/utils/vectorSelectorUtils";

import { isEqual } from "lodash";

import { useVectorListQueries } from "./queryHooks";
import {
    GroupBy,
    GroupByEnumToStringMapping,
    State,
    StatisticFunctionsEnumToStringMapping,
    VectorSpec,
    VisualizationMode,
    VisualizationModeEnumToStringMapping,
} from "./state";
import { makeFrequencyDropdownOptions } from "./utils/elementOptionsUtils";
import { EnsembleVectorListsHelper } from "./utils/ensemblesVectorListHelper";

export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");
    const [groupBy, setGroupBy] = moduleContext.useStoreState("groupBy");
    const [visualizationMode, setVisualizationMode] = moduleContext.useStoreState("visualizationMode");
    const [showHistorical, setShowHistorical] = moduleContext.useStoreState("showHistorical");
    const [showObservations, setShowObservations] = moduleContext.useStoreState("showObservations");
    const [statisticsToInclude, setStatisticsToInclude] = moduleContext.useStoreState("statisticsToInclude");
    const setVectorSpecifications = moduleContext.useSetStoreValue("vectorSpecifications");

    const [previousEnsembleSet, setPreviousEnsembleSet] = React.useState<EnsembleSet>(ensembleSet);
    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = React.useState<EnsembleIdent[]>([]);
    const [selectedVectorNames, setSelectedVectorNames] = React.useState<string[]>([]);

    const vectorListQueries = useVectorListQueries(selectedEnsembleIdents);
    const ensembleVectorListsHelper = new EnsembleVectorListsHelper(selectedEnsembleIdents, vectorListQueries);
    const vectorsUnion: VectorDescription_api[] = ensembleVectorListsHelper.vectorsUnion();

    const vectorSelectorData = createVectorSelectorDataFromVectors(vectorsUnion.map((vector) => vector.name));

    const newSelectedVectorNames = [];
    for (const vector of selectedVectorNames) {
        if (
            vectorsUnion.some((item) => {
                return item.name === vector;
            })
        ) {
            newSelectedVectorNames.push(vector);
        }
    }
    if (!isEqual(selectedVectorNames, newSelectedVectorNames)) {
        setSelectedVectorNames(newSelectedVectorNames);
    }

    const selectedVectorNamesHasHistorical = ensembleVectorListsHelper.hasAnyHistoricalVector(newSelectedVectorNames);

    if (!isEqual(ensembleSet, previousEnsembleSet)) {
        // TODO:
        // Handle change of ensembleSet-> validity of ensemble selection and vector selection
        setPreviousEnsembleSet(ensembleSet);
    }

    React.useEffect(
        function propagateVectorSpecsToView() {
            const newVectorSpecifications: VectorSpec[] = [];
            for (const ensemble of selectedEnsembleIdents) {
                for (const vector of selectedVectorNames) {
                    if (!ensembleVectorListsHelper.isVectorInEnsemble(ensemble, vector)) {
                        return;
                    }

                    newVectorSpecifications.push({
                        ensembleIdent: ensemble,
                        vectorName: vector,
                        hasHistoricalVector: ensembleVectorListsHelper.hasHistoricalVector(ensemble, vector),
                    });
                }
            }

            setVectorSpecifications(newVectorSpecifications);
        },
        [selectedEnsembleIdents, selectedVectorNames, ensembleVectorListsHelper.numberOfQueriesWithData()]
    );

    function handleGroupByChange(event: React.ChangeEvent<HTMLInputElement>) {
        setGroupBy(event.target.value as GroupBy);
    }

    function handleEnsembleSelectChange(ensembleIdentArr: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdentArr);
    }

    function handleVectorSelectChange(selection: SmartNodeSelectorSelection) {
        setSelectedVectorNames(selection.selectedTags);
    }

    function handleFrequencySelectionChange(frequency: string) {
        setResamplingFrequency(frequency as Frequency_api);
    }

    function handleShowHistorical(event: React.ChangeEvent<HTMLInputElement>) {
        setShowHistorical(event.target.checked);
    }

    function handleShowObservations(event: React.ChangeEvent<HTMLInputElement>) {
        setShowObservations(event.target.checked);
    }

    function handleVisualizationModeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setVisualizationMode(event.target.value as VisualizationMode);
    }

    function handleStatisticsToIncludeChange(
        event: React.ChangeEvent<HTMLInputElement>,
        statistic: StatisticFunction_api
    ) {
        setStatisticsToInclude((prev) => {
            if (event.target.checked) {
                return prev ? [...prev, statistic] : [statistic];
            } else {
                return prev ? prev.filter((item) => item !== statistic) : [];
            }
        });
    }

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={true} title="Group by">
                <RadioGroup
                    value={groupBy}
                    options={Object.values(GroupBy).map((val: GroupBy) => {
                        return { value: val, label: GroupByEnumToStringMapping[val] };
                    })}
                    onChange={handleGroupByChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Resampling frequency">
                <Dropdown
                    options={makeFrequencyDropdownOptions()}
                    value={resampleFrequency ?? makeFrequencyDropdownOptions()[0].value}
                    onChange={handleFrequencySelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={selectedEnsembleIdents}
                    size={5}
                    onChange={handleEnsembleSelectChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Vectors">
                <Checkbox
                    label="Show historical"
                    checked={showHistorical}
                    disabled={!selectedVectorNamesHasHistorical}
                    onChange={handleShowHistorical}
                />
                <Checkbox
                    label="Show observations"
                    checked={showObservations}
                    disabled={true}
                    onChange={handleShowObservations}
                />
                <VectorSelector
                    data={vectorSelectorData}
                    selectedTags={selectedVectorNames}
                    placeholder="Add new vector..."
                    maxNumSelectedNodes={50}
                    numSecondsUntilSuggestionsAreShown={0.5}
                    lineBreakAfterTag={true}
                    onChange={handleVectorSelectChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Visualization">
                <RadioGroup
                    value={visualizationMode}
                    options={Object.values(VisualizationMode).map((val: VisualizationMode) => {
                        return { value: val, label: VisualizationModeEnumToStringMapping[val] };
                    })}
                    onChange={handleVisualizationModeChange}
                />
                <div className="mt-4">
                    <Label text="Statistics Options">
                        <div
                            className={resolveClassNames({
                                "pointer-events-none opacity-40":
                                    visualizationMode === VisualizationMode.IndividualRealizations,
                            })}
                        >
                            {Object.values(StatisticFunction_api).map((val: StatisticFunction_api) => {
                                const description = StatisticFunctionsEnumToStringMapping[val];
                                return (
                                    <Checkbox
                                        key={val}
                                        label={description}
                                        checked={statisticsToInclude?.includes(val)}
                                        onChange={(event) => {
                                            handleStatisticsToIncludeChange(event, val);
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </Label>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
