import React from "react";

import { Frequency_api, StatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { VectorSelector, createVectorSelectorDataFromVectors } from "@framework/components/VectorSelector";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { ApiStatesWrapper } from "@lib/components/ApiStatesWrapper";
import { Checkbox } from "@lib/components/Checkbox";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { SmartNodeSelectorSelection, TreeDataNode } from "@lib/components/SmartNodeSelector";
import { useValidState } from "@lib/hooks/useValidState";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

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

    if (!isEqual(ensembleSet, previousEnsembleSet)) {
        const newSelectedEnsembleIdents = selectedEnsembleIdents.filter(
            (ensemble) => ensembleSet.findEnsemble(ensemble) !== null
        );
        const validatedEnsembleIdents = fixupEnsembleIdents(newSelectedEnsembleIdents, ensembleSet) ?? [];
        if (!isEqual(selectedEnsembleIdents, validatedEnsembleIdents)) {
            setSelectedEnsembleIdents(validatedEnsembleIdents);
        }

        setPreviousEnsembleSet(ensembleSet);
    }

    const vectorListQueries = useVectorListQueries(selectedEnsembleIdents);
    const ensembleVectorListsHelper = new EnsembleVectorListsHelper(selectedEnsembleIdents, vectorListQueries);
    const selectedVectorNamesHasHistorical = ensembleVectorListsHelper.hasAnyHistoricalVector(selectedVectorNames);
    const currentVectorSelectorData = createVectorSelectorDataFromVectors(ensembleVectorListsHelper.vectorsUnion());

    // Get union of continuous and non-constant parameters for selected ensembles and set valid parameter ident str
    const continuousAndNonConstantParametersUnion: ParameterIdent[] = [];
    for (const ensembleIdent of selectedEnsembleIdents) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        if (ensemble === null) continue;

        for (const parameter of ensemble.getParameters().getParameterIdents(ParameterType.CONTINUOUS)) {
            if (continuousAndNonConstantParametersUnion.some((param) => param.equals(parameter))) continue;
            if (ensemble.getParameters().getParameter(parameter).isConstant) continue;

            continuousAndNonConstantParametersUnion.push(parameter);
        }
    }
    const [selectedParameterIdentStr, setSelectedParameterIdentStr] = useValidState<string | null>(null, [
        continuousAndNonConstantParametersUnion,
        (item: ParameterIdent) => item.toString(),
    ]);

    // Await update of vectorSelectorData until all vector lists are retrieved
    const hasVectorListQueriesErrorOrFetching = vectorListQueries.some((query) => query.isFetching || query.isError);
    if (!hasVectorListQueriesErrorOrFetching && !isEqual(currentVectorSelectorData, vectorSelectorData)) {
        setVectorSelectorData(currentVectorSelectorData);
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
                const isParameterInUnion = continuousAndNonConstantParametersUnion.some((parameter) =>
                    parameter.equals(newParameterIdent)
                );
                if (isParameterInUnion) {
                    setParameterIdent(newParameterIdent);
                } else {
                    setParameterIdent(null);
                }
            } catch {
                setParameterIdent(null);
            }
        },
        [selectedParameterIdentStr]
    );

    function handleGroupByChange(event: React.ChangeEvent<HTMLInputElement>) {
        setGroupBy(event.target.value as GroupBy);
    }

    function handleColorByParameterChange(parameterIdentStr: string) {
        setSelectedParameterIdentStr(parameterIdentStr);
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

    // Set active statistics for checkboxes
    let candidateStatisticsVisualization = statisticsType;
    if (statisticsType !== StatisticsType.FANCHART && visualizationMode === VisualizationMode.STATISTICAL_FANCHART) {
        candidateStatisticsVisualization = StatisticsType.FANCHART;
    }
    if (
        statisticsType !== StatisticsType.INDIVIDUAL &&
        [VisualizationMode.STATISTICAL_LINES, VisualizationMode.STATISTICS_AND_REALIZATIONS].includes(visualizationMode)
    ) {
        candidateStatisticsVisualization = StatisticsType.INDIVIDUAL;
    }
    if (statisticsType !== candidateStatisticsVisualization) {
        setStatisticsType(candidateStatisticsVisualization);
    }
    const computedStatisticsVisualization = candidateStatisticsVisualization;

    function makeStatisticCheckboxes() {
        if (computedStatisticsVisualization === StatisticsType.FANCHART) {
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
        if (computedStatisticsVisualization === StatisticsType.INDIVIDUAL) {
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
                    className={resolveClassNames("mt-4 ml-6 mb-4", {
                        ["pointer-events-none opacity-70"]:
                            !colorRealizationsByParameter ||
                            visualizationMode !== VisualizationMode.INDIVIDUAL_REALIZATIONS,
                    })}
                >
                    <Dropdown
                        options={continuousAndNonConstantParametersUnion.map((elm) => {
                            return {
                                value: elm.toString(),
                                label: elm.groupName ? `${elm.groupName}:${elm.name}` : elm.name,
                            };
                        })}
                        value={selectedParameterIdentStr?.toString() ?? undefined}
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
