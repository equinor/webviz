import React from "react";

import { Frequency_api, StatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Parameter, ParameterIdent } from "@framework/EnsembleParameters";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { ParameterListFilter } from "@framework/components/ParameterListFilter";
import { VectorSelector } from "@framework/components/VectorSelector";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { QueriesErrorCriteria, QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { FilterAlt } from "@mui/icons-material";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
    colorRealizationsByParameterAtom,
    filteredParameterIdentListAtom,
    groupByAtom,
    resampleFrequencyAtom,
    selectedVectorNamesAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedParameterIdentStringAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";
import {
    continuousAndNonConstantParametersUnionAtom,
    ensembleVectorListsHelperAtom,
    isVectorListQueriesFetchingAtom,
    selectedEnsembleIdentsAtom,
    selectedParameterIdentStringAtom,
    statisticsTypeAtom,
    vectorSelectorDataAtom,
} from "./atoms/derivedAtoms";
import { vectorListQueriesAtom } from "./atoms/queryAtoms";
import { useMakeSettingsStatusWriterMessages } from "./hooks/useMakeSettingsStatusWriterMessages";

import { Interfaces } from "../interfaces";
import {
    FanchartStatisticOption,
    FanchartStatisticOptionEnumToStringMapping,
    FrequencyEnumToStringMapping,
    GroupBy,
    GroupByEnumToStringMapping,
    StatisticFunctionEnumToStringMapping,
    StatisticsType,
    VisualizationMode,
    VisualizationModeEnumToStringMapping,
} from "../typesAndEnums";

export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const [selectedVectorTags, setSelectedVectorTags] = React.useState<string[]>([]);

    const [resampleFrequency, setResamplingFrequency] = useAtom(resampleFrequencyAtom);
    const [groupBy, setGroupBy] = useAtom(groupByAtom);
    const [colorRealizationsByParameter, setColorRealizationsByParameter] = useAtom(colorRealizationsByParameterAtom);
    const [visualizationMode, setVisualizationMode] = useAtom(visualizationModeAtom);
    const [showHistorical, setShowHistorical] = useAtom(showHistoricalAtom);
    const [showObservations, setShowObservations] = useAtom(showObservationsAtom);
    const [statisticsSelection, setStatisticsSelection] = useAtom(statisticsSelectionAtom);
    const [selectedVectorNames, setSelectedVectorNames] = useAtom(selectedVectorNamesAtom);
    const vectorSelectorData = useAtomValue(vectorSelectorDataAtom);
    const statisticsType = useAtomValue(statisticsTypeAtom);
    const [filteredParameterIdentList, setFilteredParameterIdentList] = useAtom(filteredParameterIdentListAtom);
    const setUserSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);
    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const continuousAndNonConstantParametersUnion = useAtomValue(continuousAndNonConstantParametersUnionAtom);
    const vectorListQueries = useAtomValue(vectorListQueriesAtom);
    const ensembleVectorListsHelper = useAtomValue(ensembleVectorListsHelperAtom);
    const isVectorListQueriesFetching = useAtomValue(isVectorListQueriesFetchingAtom);
    const setUserSelectedParameterIdentStr = useSetAtom(userSelectedParameterIdentStringAtom);
    const selectedParameterIdentStr = useAtomValue(selectedParameterIdentStringAtom);

    useMakeSettingsStatusWriterMessages(statusWriter, selectedVectorTags);

    function handleGroupByChange(event: React.ChangeEvent<HTMLInputElement>) {
        setGroupBy(event.target.value as GroupBy);
    }

    function handleColorByParameterChange(parameterIdentStrings: string[]) {
        if (parameterIdentStrings.length !== 0) {
            setUserSelectedParameterIdentStr(parameterIdentStrings[0]);
            return;
        }
        setUserSelectedParameterIdentStr(null);
    }

    function handleEnsembleSelectChange(ensembleIdentArr: EnsembleIdent[]) {
        setUserSelectedEnsembleIdents(ensembleIdentArr);
    }

    function handleVectorSelectionChange(selection: SmartNodeSelectorSelection) {
        setSelectedVectorNames(selection.selectedNodes);
        setSelectedVectorTags(selection.selectedTags);
    }

    function handleFrequencySelectionChange(newFrequencyStr: string) {
        const newFreq = newFrequencyStr !== "RAW" ? (newFrequencyStr as Frequency_api) : null;
        setResamplingFrequency(newFreq);
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

    function handleFanchartStatisticsSelectionChange(
        event: React.ChangeEvent<HTMLInputElement>,
        statistic: FanchartStatisticOption
    ) {
        setStatisticsSelection((prev) => {
            if (event.target.checked) {
                return {
                    IndividualStatisticsSelection: prev.IndividualStatisticsSelection,
                    FanchartStatisticsSelection: prev.FanchartStatisticsSelection
                        ? [...prev.FanchartStatisticsSelection, statistic]
                        : [statistic],
                };
            } else {
                return {
                    IndividualStatisticsSelection: prev.IndividualStatisticsSelection,
                    FanchartStatisticsSelection: prev.FanchartStatisticsSelection
                        ? prev.FanchartStatisticsSelection.filter((item) => item !== statistic)
                        : [],
                };
            }
        });
    }

    const handleParameterListFilterChange = React.useCallback(
        function handleParameterListFilterChange(filteredParameters: Parameter[]) {
            const filteredParamIdents = filteredParameters.map((elm) =>
                ParameterIdent.fromNameAndGroup(elm.name, elm.groupName)
            );

            setFilteredParameterIdentList(filteredParamIdents);
        },
        [setFilteredParameterIdentList]
    );

    function handleIndividualStatisticsSelectionChange(
        event: React.ChangeEvent<HTMLInputElement>,
        statistic: StatisticFunction_api
    ) {
        setStatisticsSelection((prev) => {
            if (event.target.checked) {
                return {
                    IndividualStatisticsSelection: prev.IndividualStatisticsSelection
                        ? [...prev.IndividualStatisticsSelection, statistic]
                        : [statistic],
                    FanchartStatisticsSelection: prev.FanchartStatisticsSelection,
                };
            } else {
                return {
                    IndividualStatisticsSelection: prev.IndividualStatisticsSelection
                        ? prev.IndividualStatisticsSelection.filter((item) => item !== statistic)
                        : [],
                    FanchartStatisticsSelection: prev.FanchartStatisticsSelection,
                };
            }
        });
    }

    function makeStatisticCheckboxes() {
        if (statisticsType === StatisticsType.FANCHART) {
            return Object.values(FanchartStatisticOption).map((value: FanchartStatisticOption) => {
                return (
                    <Checkbox
                        key={value}
                        label={FanchartStatisticOptionEnumToStringMapping[value]}
                        checked={statisticsSelection?.FanchartStatisticsSelection?.includes(value)}
                        onChange={(event) => {
                            handleFanchartStatisticsSelectionChange(event, value);
                        }}
                    />
                );
            });
        }
        if (statisticsType === StatisticsType.INDIVIDUAL) {
            return Object.values(StatisticFunction_api).map((value: StatisticFunction_api) => {
                return (
                    <Checkbox
                        key={value}
                        label={StatisticFunctionEnumToStringMapping[value]}
                        checked={statisticsSelection?.IndividualStatisticsSelection.includes(value)}
                        onChange={(event) => {
                            handleIndividualStatisticsSelectionChange(event, value);
                        }}
                    />
                );
            });
        }

        return [];
    }

    const selectedVectorNamesHasHistorical =
        !isVectorListQueriesFetching && ensembleVectorListsHelper.hasAnyHistoricalVector(selectedVectorNames);

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup expanded={false} title="Group by">
                <RadioGroup
                    value={groupBy}
                    options={Object.values(GroupBy).map((val: GroupBy) => {
                        return { value: val, label: GroupByEnumToStringMapping[val] };
                    })}
                    onChange={handleGroupByChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Resampling frequency">
                <Dropdown
                    options={[
                        { value: "RAW", label: "None (raw)" },
                        ...Object.values(Frequency_api).map((val: Frequency_api) => {
                            return { value: val, label: FrequencyEnumToStringMapping[val] };
                        }),
                    ]}
                    value={resampleFrequency ?? Frequency_api.MONTHLY}
                    onChange={handleFrequencySelectionChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <EnsembleSelect
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
                <Checkbox label="Show observations" checked={showObservations} onChange={handleShowObservations} />
                <div
                    className={resolveClassNames({
                        "pointer-events-none opacity-80": vectorListQueries.some((query) => query.isLoading),
                    })}
                >
                    <QueryStateWrapper
                        queryResults={vectorListQueries}
                        loadingComponent={<CircularProgress />}
                        showErrorWhen={QueriesErrorCriteria.ALL_QUERIES_HAVE_ERROR}
                        errorComponent={"Could not load vectors for selected ensembles"}
                    >
                        <VectorSelector
                            data={vectorSelectorData}
                            placeholder="Add new vector..."
                            maxNumSelectedNodes={50}
                            numSecondsUntilSuggestionsAreShown={0.5}
                            lineBreakAfterTag={true}
                            onChange={handleVectorSelectionChange}
                        />
                    </QueryStateWrapper>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Color realization by parameter">
                <Checkbox
                    label="Enable"
                    checked={colorRealizationsByParameter}
                    disabled={visualizationMode !== VisualizationMode.INDIVIDUAL_REALIZATIONS}
                    onChange={(event) => {
                        setColorRealizationsByParameter(event.target.checked);
                    }}
                />
                <div
                    className={resolveClassNames({
                        ["pointer-events-none opacity-70"]:
                            !colorRealizationsByParameter ||
                            visualizationMode !== VisualizationMode.INDIVIDUAL_REALIZATIONS,
                    })}
                >
                    <div className="mt-4 mb-4">
                        <CollapsibleGroup
                            expanded={false}
                            title="Parameter list filter"
                            icon={<FilterAlt fontSize="small" />}
                        >
                            <ParameterListFilter
                                parameters={continuousAndNonConstantParametersUnion}
                                initialFilters={["Continuous", "Nonconstant"]}
                                onChange={handleParameterListFilterChange}
                            />
                        </CollapsibleGroup>
                    </div>
                    <Select
                        options={filteredParameterIdentList.map((elm) => {
                            return {
                                value: elm.toString(),
                                label: elm.groupName ? `${elm.groupName}:${elm.name}` : elm.name,
                            };
                        })}
                        size={4}
                        value={selectedParameterIdentStr ? [selectedParameterIdentStr.toString()] : undefined}
                        onChange={handleColorByParameterChange}
                    />
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Visualization">
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
                                    visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS,
                            })}
                        >
                            {makeStatisticCheckboxes()}
                        </div>
                    </Label>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
