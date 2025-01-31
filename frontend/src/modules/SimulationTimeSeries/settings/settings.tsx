import React from "react";

import { Frequency_api, StatisticFunction_api } from "@api";
import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import { Parameter, ParameterIdent } from "@framework/EnsembleParameters";
import { ModuleSettingsProps } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { ParameterListFilter } from "@framework/components/ParameterListFilter";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueriesErrorCriteria, QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { Switch } from "@lib/components/Switch";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { VectorSelector } from "@modules/_shared/components/VectorSelector";
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
    subplotLimitDirectionAtom,
    subplotMaxDirectionElementsAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedParameterIdentStringAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";
import {
    continuousAndNonConstantParametersUnionAtom,
    customVectorDefinitionsAtom,
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
    SubplotLimitDirection,
    SubplotLimitDirectionEnumToStringMapping,
    VisualizationMode,
    VisualizationModeEnumToStringMapping,
} from "../typesAndEnums";

export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const [selectedVectorTags, setSelectedVectorTags] = React.useState<string[]>([]);
    const [showParameterListFilter, setShowParameterListFilter] = React.useState(false);

    const [resampleFrequency, setResamplingFrequency] = useAtom(resampleFrequencyAtom);
    const [groupBy, setGroupBy] = useAtom(groupByAtom);
    const [subplotLimitDirection, setSubplotLimitDirection] = useAtom(subplotLimitDirectionAtom);
    const [subplotMaxDirectionElements, setSubplotMaxDirectionElements] = useAtom(subplotMaxDirectionElementsAtom);
    const [colorRealizationsByParameter, setColorRealizationsByParameter] = useAtom(colorRealizationsByParameterAtom);
    const [visualizationMode, setVisualizationMode] = useAtom(visualizationModeAtom);
    const [showHistorical, setShowHistorical] = useAtom(showHistoricalAtom);
    const [showObservations, setShowObservations] = useAtom(showObservationsAtom);
    const [statisticsSelection, setStatisticsSelection] = useAtom(statisticsSelectionAtom);
    const [selectedVectorNames, setSelectedVectorNames] = useAtom(selectedVectorNamesAtom);
    const vectorSelectorData = useAtomValue(vectorSelectorDataAtom);
    const customVectorDefinitions = useAtomValue(customVectorDefinitionsAtom);
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

    function handleSubplotLimitDirectionChange(newLimitDirection: SubplotLimitDirection) {
        setSubplotLimitDirection(newLimitDirection);
    }

    function handleSubplotMaxDirectionElementsChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSubplotMaxDirectionElements(parseInt(event.target.value));
    }

    function handleGroupByChange(newValue: GroupBy) {
        setGroupBy(newValue);
    }

    function handleColorByParameterChange(parameterIdentStrings: string[]) {
        if (parameterIdentStrings.length !== 0) {
            setUserSelectedParameterIdentStr(parameterIdentStrings[0]);
            return;
        }
        setUserSelectedParameterIdentStr(null);
    }

    function handleEnsembleSelectChange(ensembleIdentArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[]) {
        setUserSelectedEnsembleIdents(ensembleIdentArray);
    }

    function handleVectorSelectionChange(selection: SmartNodeSelectorSelection) {
        setSelectedVectorNames(selection.selectedNodes);
        setSelectedVectorTags(selection.selectedTags.map((tag) => tag.text));
    }

    function handleFrequencySelectionChange(newFrequencyStr: string) {
        const newFreq = newFrequencyStr !== "RAW" ? (newFrequencyStr as Frequency_api) : null;
        setResamplingFrequency(newFreq);
    }

    function handleShowHistorical(isChecked: boolean) {
        setShowHistorical(isChecked);
    }

    function handleShowObservations(event: React.ChangeEvent<HTMLInputElement>) {
        setShowObservations(event.target.checked);
    }

    function handleVisualizationModeChange(value: VisualizationMode) {
        setVisualizationMode(value);
        setShowParameterListFilter(false);
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
            <CollapsibleGroup expanded={true} title="Plot settings">
                <Label text="Limit subplots by">
                    <div className="flex flex-row gap-2">
                        <Dropdown
                            options={Object.values(SubplotLimitDirection).map((val: SubplotLimitDirection) => {
                                return { value: val, label: SubplotLimitDirectionEnumToStringMapping[val] };
                            })}
                            value={subplotLimitDirection}
                            onChange={handleSubplotLimitDirectionChange}
                        />
                        <Input
                            type="number"
                            value={subplotMaxDirectionElements}
                            disabled={subplotLimitDirection === SubplotLimitDirection.NONE}
                            min={1}
                            max={12}
                            debounceTimeMs={150}
                            onChange={handleSubplotMaxDirectionElementsChange}
                        />
                    </div>
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Group by">
                <RadioGroup
                    value={groupBy}
                    options={Object.values(GroupBy).map((val: GroupBy) => {
                        return { value: val, label: GroupByEnumToStringMapping[val] };
                    })}
                    onChange={(_, value) => handleGroupByChange(value)}
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
                    ensembles={ensembleSet.getEnsembleArray()}
                    value={selectedEnsembleIdents}
                    allowDeltaEnsembles={true}
                    size={5}
                    onChange={handleEnsembleSelectChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Vectors">
                <Checkbox
                    label="Show historical"
                    checked={showHistorical}
                    disabled={!selectedVectorNamesHasHistorical}
                    onChange={(_, checked) => handleShowHistorical(checked)}
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
                            customVectorDefinitions={customVectorDefinitions ?? undefined}
                        />
                    </QueryStateWrapper>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={false} title="Visualization">
                <RadioGroup
                    value={visualizationMode}
                    options={Object.values(VisualizationMode).map((val: VisualizationMode) => {
                        return { value: val, label: VisualizationModeEnumToStringMapping[val] };
                    })}
                    onChange={(_, value) => handleVisualizationModeChange(value)}
                />
                <div className="mt-6 p-2 rounded-md outline outline-1 outline-slate-300">
                    <div
                        className={resolveClassNames("", {
                            hidden: visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS,
                        })}
                    >
                        <Label text="Statistics Options">
                            <div>{makeStatisticCheckboxes()}</div>
                        </Label>
                    </div>
                    <div
                        className={resolveClassNames({
                            hidden: visualizationMode !== VisualizationMode.INDIVIDUAL_REALIZATIONS,
                        })}
                    >
                        <Label text="Color realization by parameter" position="left" wrapperClassName="mt-2 mb-2">
                            <Switch
                                checked={colorRealizationsByParameter}
                                disabled={visualizationMode !== VisualizationMode.INDIVIDUAL_REALIZATIONS}
                                onChange={(event) => setColorRealizationsByParameter(event.target.checked)}
                            />
                        </Label>
                        <div
                            className={resolveClassNames({
                                "pointer-events-none opacity-70":
                                    !colorRealizationsByParameter ||
                                    visualizationMode !== VisualizationMode.INDIVIDUAL_REALIZATIONS,
                            })}
                        >
                            <div className="flex flex-col">
                                <div className="flex flex-row justify-center items-center p-2 bg-slate-100 shadow-sm border-b">
                                    <h3 className="text-sm font-semibold flex-grow leading-none">Select Parameter</h3>
                                    <IconButton
                                        color="secondary"
                                        title="Filter list of parameters"
                                        onClick={() => setShowParameterListFilter((prev) => !prev)}
                                    >
                                        <FilterAlt fontSize="small" />
                                    </IconButton>
                                </div>
                                <div
                                    className={resolveClassNames("p-2 border shadow-md", {
                                        hidden: !showParameterListFilter,
                                    })}
                                >
                                    <Label text="Filter parameters on selection">
                                        <ParameterListFilter
                                            parameters={continuousAndNonConstantParametersUnion}
                                            initialFilters={["Continuous", "Nonconstant"]}
                                            onChange={handleParameterListFilterChange}
                                        />
                                    </Label>
                                </div>
                                <div className={`${showParameterListFilter ? "pt-3" : "pt-1"}`}>
                                    <Select
                                        options={filteredParameterIdentList.map((elm) => ({
                                            value: elm.toString(),
                                            label: elm.groupName ? `${elm.groupName}:${elm.name}` : elm.name,
                                        }))}
                                        size={6}
                                        value={
                                            selectedParameterIdentStr
                                                ? [selectedParameterIdentStr.toString()]
                                                : undefined
                                        }
                                        onChange={handleColorByParameterChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
