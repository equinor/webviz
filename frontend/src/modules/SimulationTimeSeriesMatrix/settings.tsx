import React from "react";

import { Frequency_api, StatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { ParameterListFilter } from "@framework/components/ParameterListFilter";
import { VectorSelector, createVectorSelectorDataFromVectors } from "@framework/components/VectorSelector";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { ApiStatesWrapper } from "@lib/components/ApiStatesWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { SmartNodeSelectorSelection, TreeDataNode } from "@lib/components/SmartNodeSelector";
import { useValidState } from "@lib/hooks/useValidState";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { FilterAlt } from "@mui/icons-material";

import { isEqual } from "lodash";

import { useVectorListQueries } from "./queryHooks";
import {
    FanchartStatisticOption,
    FanchartStatisticOptionEnumToStringMapping,
    FrequencyEnumToStringMapping,
    GroupBy,
    GroupByEnumToStringMapping,
    State,
    StatisticFunctionEnumToStringMapping,
    VectorSpec,
    VisualizationMode,
    VisualizationModeEnumToStringMapping,
} from "./state";
import { EnsembleVectorListsHelper } from "./utils/ensemblesVectorListHelper";

enum StatisticsType {
    INDIVIDUAL = "Individual",
    FANCHART = "Fanchart",
}

export function settings({ moduleContext, workbenchSession }: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(workbenchSession);

    // Store state/values
    const [resampleFrequency, setResamplingFrequency] = moduleContext.useStoreState("resamplingFrequency");
    const [groupBy, setGroupBy] = moduleContext.useStoreState("groupBy");
    const [colorRealizationsByParameter, setColorRealizationsByParameter] =
        moduleContext.useStoreState("colorRealizationsByParameter");
    const [visualizationMode, setVisualizationMode] = moduleContext.useStoreState("visualizationMode");
    const [showHistorical, setShowHistorical] = moduleContext.useStoreState("showHistorical");
    const [showObservations, setShowObservations] = moduleContext.useStoreState("showObservations");
    const [statisticsSelection, setStatisticsSelection] = moduleContext.useStoreState("statisticsSelection");
    const setParameterIdent = moduleContext.useSetStoreValue("parameterIdent");
    const setVectorSpecifications = moduleContext.useSetStoreValue("vectorSpecifications");

    // States
    const [previousEnsembleSet, setPreviousEnsembleSet] = React.useState<EnsembleSet>(ensembleSet);
    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = React.useState<EnsembleIdent[]>([]);
    const [selectedVectorNames, setSelectedVectorNames] = React.useState<string[]>([]);
    const [vectorSelectorData, setVectorSelectorData] = React.useState<TreeDataNode[]>([]);
    const [statisticsType, setStatisticsType] = React.useState<StatisticsType>(StatisticsType.INDIVIDUAL);
    const [filteredParameterIdentList, setFilteredParameterIdentList] = React.useState<ParameterIdent[]>([]);

    if (!isEqual(ensembleSet, previousEnsembleSet)) {
        const newSelectedEnsembleIdents = selectedEnsembleIdents.filter((ensemble) =>
            ensembleSet.hasEnsemble(ensemble)
        );
        const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet) ?? [];
        if (!isEqual(selectedEnsembleIdents, validatedEnsembleIdents)) {
            setSelectedEnsembleIdents(validatedEnsembleIdents);
        }

        setPreviousEnsembleSet(ensembleSet);
    }

    // Get list of continuous parameters from selected ensembles
    const continuousAndNonConstantParametersUnion: Parameter[] = [];
    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (!ensemble) continue;

        const continuousAndNonConstantParameters = ensemble
            .getParameters()
            .getParameterArr()
            .filter((parameter) => parameter.type === ParameterType.CONTINUOUS && !parameter.isConstant);

        // Add non-duplicate parameters to list - verified by ParameterIdent
        for (const parameter of continuousAndNonConstantParameters) {
            const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
            const isParameterInUnion = continuousAndNonConstantParametersUnion.some((elm) =>
                parameterIdent.equals(ParameterIdent.fromNameAndGroup(elm.name, elm.groupName))
            );

            if (isParameterInUnion) continue;
            continuousAndNonConstantParametersUnion.push(parameter);
        }
    }

    const vectorListQueries = useVectorListQueries(selectedEnsembleIdents);
    const ensembleVectorListsHelper = new EnsembleVectorListsHelper(selectedEnsembleIdents, vectorListQueries);
    const selectedVectorNamesHasHistorical = ensembleVectorListsHelper.hasAnyHistoricalVector(selectedVectorNames);
    const currentVectorSelectorData = createVectorSelectorDataFromVectors(ensembleVectorListsHelper.vectorsUnion());

    const [selectedParameterIdentStr, setSelectedParameterIdentStr] = useValidState<string | null>(null, [
        filteredParameterIdentList,
        (item: ParameterIdent) => item.toString(),
    ]);

    // Await update of vectorSelectorData until all vector lists are retrieved
    const hasVectorListQueriesErrorOrFetching = vectorListQueries.some((query) => query.isFetching || query.isError);
    if (!hasVectorListQueriesErrorOrFetching && !isEqual(currentVectorSelectorData, vectorSelectorData)) {
        setVectorSelectorData(currentVectorSelectorData);
    }

    // Set statistics type for checkbox rendering
    const computedStatisticsType = computeStatisticsType(statisticsType, visualizationMode);
    if (statisticsType !== computedStatisticsType) {
        setStatisticsType(computedStatisticsType);
    }

    React.useEffect(
        function propagateVectorSpecsToView() {
            const newVectorSpecifications: VectorSpec[] = [];
            for (const ensemble of selectedEnsembleIdents) {
                for (const vector of selectedVectorNames) {
                    if (!ensembleVectorListsHelper.isVectorInEnsemble(ensemble, vector)) {
                        continue;
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

    React.useEffect(
        function propagateParameterIdentToView() {
            if (selectedParameterIdentStr === null) {
                setParameterIdent(null);
                return;
            }

            // Try/catch as ParameterIdent.fromString() can throw
            try {
                const newParameterIdent = ParameterIdent.fromString(selectedParameterIdentStr);
                const isParameterAmongFiltered = filteredParameterIdentList.some((parameter) =>
                    parameter.equals(newParameterIdent)
                );
                if (isParameterAmongFiltered) {
                    setParameterIdent(newParameterIdent);
                } else {
                    setParameterIdent(null);
                }
            } catch {
                setParameterIdent(null);
            }
        },
        [selectedParameterIdentStr, filteredParameterIdentList]
    );

    function handleGroupByChange(event: React.ChangeEvent<HTMLInputElement>) {
        setGroupBy(event.target.value as GroupBy);
    }

    function handleColorByParameterChange(parameterIdentStrings: string[]) {
        if (parameterIdentStrings.length !== 0) {
            setSelectedParameterIdentStr(parameterIdentStrings[0]);
            return;
        }
        setSelectedParameterIdentStr(null);
    }

    function handleEnsembleSelectChange(ensembleIdentArr: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdentArr);
    }

    function handleVectorSelectChange(selection: SmartNodeSelectorSelection) {
        setSelectedVectorNames(selection.selectedNodes);
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
        if (computedStatisticsType === StatisticsType.FANCHART) {
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
        if (computedStatisticsType === StatisticsType.INDIVIDUAL) {
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
                    label="Show observations - NEED DATA IN SUMO"
                    checked={showObservations}
                    disabled={true}
                    onChange={handleShowObservations}
                />
                <div
                    className={resolveClassNames({
                        "pointer-events-none opacity-80": vectorListQueries.some((query) => query.isLoading),
                    })}
                >
                    <ApiStatesWrapper
                        apiResults={vectorListQueries}
                        loadingComponent={<CircularProgress />}
                        errorComponent={"Could not load the vectors for selected ensembles"}
                    >
                        <VectorSelector
                            data={vectorSelectorData}
                            placeholder="Add new vector..."
                            maxNumSelectedNodes={50}
                            numSecondsUntilSuggestionsAreShown={0.5}
                            lineBreakAfterTag={true}
                            onChange={handleVectorSelectChange}
                        />
                    </ApiStatesWrapper>
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

function computeStatisticsType(
    previousStatisticsType: StatisticsType,
    visualizationMode: VisualizationMode
): StatisticsType {
    if (
        previousStatisticsType !== StatisticsType.FANCHART &&
        visualizationMode === VisualizationMode.STATISTICAL_FANCHART
    ) {
        return StatisticsType.FANCHART;
    }

    if (
        previousStatisticsType !== StatisticsType.INDIVIDUAL &&
        [VisualizationMode.STATISTICAL_LINES, VisualizationMode.STATISTICS_AND_REALIZATIONS].includes(visualizationMode)
    ) {
        return StatisticsType.INDIVIDUAL;
    }

    return previousStatisticsType;
}
