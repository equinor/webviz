import React from "react";

import { FilterAlt } from "@mui/icons-material";
import { useAtom, useAtomValue } from "jotai";

import { Frequency_api, StatisticFunction_api } from "@api";
import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import { ParameterListFilter } from "@framework/components/ParameterListFilter";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { Parameter } from "@framework/EnsembleParameters";
import { ParameterIdent } from "@framework/EnsembleParameters";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey } from "@framework/SyncSettings";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Label } from "@lib/components/Label";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import type { SmartNodeSelectorSelection } from "@lib/newComponents/SmartNodeSelector";
import { useDebouncedFunction } from "@lib/hooks/usedDebouncedStateEmit";
import { CheckboxCompositions } from "@lib/newComponents/Checkbox";
import { Collapsible } from "@lib/newComponents/Collapsible";
import { Combobox } from "@lib/newComponents/Combobox";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { Hidden } from "@lib/newComponents/Hidden";
import { NumberInput } from "@lib/newComponents/NumberInput";
import { RadioCompositions } from "@lib/newComponents/Radio";
import { Select } from "@lib/newComponents/Select";
import { Separator } from "@lib/newComponents/Separator";
import { Switch } from "@lib/newComponents/Switch";
import { Toggle } from "@lib/newComponents/Toggle";
import { TooltipCompositions } from "@lib/newComponents/Tooltip/compositions";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { VectorSelector } from "@modules/_shared/components/VectorSelector";
import { useSyncSetting } from "@modules/_shared/hooks/useSyncSetting";

import type { Interfaces } from "../interfaces";
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

import {
    colorRealizationsByParameterAtom,
    filteredParameterIdentListAtom,
    groupByAtom,
    resampleFrequencyAtom,
    selectedVectorNamesAtom,
    selectedVectorTagsAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    subplotLimitDirectionAtom,
    subplotMaxDirectionElementsAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";
import {
    continuousAndNonConstantParametersUnionAtom,
    customVectorDefinitionsAtom,
    ensembleVectorListsHelperAtom,
    isVectorListQueriesFetchingAtom,
    statisticsTypeAtom,
    vectorSelectorDataAtom,
} from "./atoms/derivedAtoms";
import { selectedEnsembleIdentsAtom, selectedParameterIdentStringAtom } from "./atoms/persistableFixableAtoms";
import { vectorListQueriesAtom } from "./atoms/queryAtoms";
import {
    useResampleFrequencyWarningAnnotation,
    useSelectedEnsembleIdentsAnnotations,
    useSelectedParameterIdentStringAnnotations,
    useVectorListQueriesErrorAnnotation,
} from "./hooks/settingAnnotationHooks";
import { useMakeSettingsStatusWriterMessages } from "./hooks/useMakeSettingsStatusWriterMessages";

export function Settings(props: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

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
    const [selectedVectorTags, setSelectedVectorTags] = useAtom(selectedVectorTagsAtom);
    const [selectedVectorNames, setSelectedVectorNames] = useAtom(selectedVectorNamesAtom);
    const vectorSelectorData = useAtomValue(vectorSelectorDataAtom);
    const customVectorDefinitions = useAtomValue(customVectorDefinitionsAtom);
    const statisticsType = useAtomValue(statisticsTypeAtom);
    const [filteredParameterIdentList, setFilteredParameterIdentList] = useAtom(filteredParameterIdentListAtom);
    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);
    const continuousAndNonConstantParametersUnion = useAtomValue(continuousAndNonConstantParametersUnionAtom);
    const vectorListQueries = useAtomValue(vectorListQueriesAtom);
    const ensembleVectorListsHelper = useAtomValue(ensembleVectorListsHelperAtom);
    const isVectorListQueriesFetching = useAtomValue(isVectorListQueriesFetchingAtom);
    const [selectedParameterIdentStr, setSelectedParameterIdentStr] = useAtom(selectedParameterIdentStringAtom);

    // Receive global parameter string and update local state if different
    useSyncSetting({
        workbenchServices: props.workbenchServices,
        moduleContext: props.settingsContext,
        syncSettingKey: SyncSettingKey.PARAMETER,
        topic: "global.syncValue.parameter",
        value: selectedParameterIdentStr.value,
        setValue: setSelectedParameterIdentStr,
    });

    useMakeSettingsStatusWriterMessages(statusWriter, selectedVectorTags);

    function handleSubplotLimitDirectionChange(newLimitDirection: SubplotLimitDirection | null) {
        if (newLimitDirection === null) {
            return;
        }

        setSubplotLimitDirection(newLimitDirection);
    }

    function handleSubplotMaxDirectionElementsChange(value: number | null) {
        if (value === null) {
            return;
        }
        setSubplotMaxDirectionElements(value);
    }

    const debouncedHandleSubplotMaxDirectionElementsChange = useDebouncedFunction(
        handleSubplotMaxDirectionElementsChange,
        150,
    );

    function handleGroupByChange(newValue: GroupBy) {
        setGroupBy(newValue);
    }

    function handleColorByParameterChange(parameterIdentStrings: string[]) {
        if (parameterIdentStrings.length !== 0) {
            setSelectedParameterIdentStr(parameterIdentStrings[0]);
            return;
        }
        setSelectedParameterIdentStr(null);
    }

    function handleEnsembleSelectChange(ensembleIdentArray: (RegularEnsembleIdent | DeltaEnsembleIdent)[]) {
        setSelectedEnsembleIdents(ensembleIdentArray);
    }

    function handleVectorSelectionChange(selection: SmartNodeSelectorSelection) {
        setSelectedVectorNames(selection.selectedNodes);
        setSelectedVectorTags(selection.selectedTags.map((tag) => tag.text));
    }

    function handleFrequencySelectionChange(newFrequencyStr: string | null) {
        if (newFrequencyStr === null) {
            return;
        }
        const newFreq = newFrequencyStr !== "RAW" ? (newFrequencyStr as Frequency_api) : null;
        setResamplingFrequency(newFreq);
    }

    function handleShowHistorical(isChecked: boolean) {
        setShowHistorical(isChecked);
    }

    function handleShowObservations(checked: boolean) {
        setShowObservations(checked);
    }

    function handleVisualizationModeChange(value: VisualizationMode) {
        setVisualizationMode(value);
        setShowParameterListFilter(false);
    }

    function handleFanchartStatisticsSelectionChange(checked: boolean, statistic: FanchartStatisticOption) {
        setStatisticsSelection((prev) => {
            if (checked) {
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
                ParameterIdent.fromNameAndGroup(elm.name, elm.groupName),
            );

            setFilteredParameterIdentList(filteredParamIdents);
        },
        [setFilteredParameterIdentList],
    );

    function handleIndividualStatisticsSelectionChange(checked: boolean, statistic: StatisticFunction_api) {
        setStatisticsSelection((prev) => {
            if (checked) {
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
                    <CheckboxCompositions.WithLabel
                        key={value}
                        label={FanchartStatisticOptionEnumToStringMapping[value]}
                        checked={statisticsSelection?.FanchartStatisticsSelection?.includes(value)}
                        onCheckedChange={(checked) => {
                            handleFanchartStatisticsSelectionChange(checked, value);
                        }}
                        size="small"
                    />
                );
            });
        }
        if (statisticsType === StatisticsType.INDIVIDUAL) {
            return Object.values(StatisticFunction_api).map((value: StatisticFunction_api) => {
                return (
                    <CheckboxCompositions.WithLabel
                        key={value}
                        label={StatisticFunctionEnumToStringMapping[value]}
                        checked={statisticsSelection?.IndividualStatisticsSelection.includes(value)}
                        onCheckedChange={(checked) => {
                            handleIndividualStatisticsSelectionChange(checked, value);
                        }}
                        size="small"
                    />
                );
            });
        }

        return [];
    }

    const selectedVectorNamesHasHistorical =
        !isVectorListQueriesFetching && ensembleVectorListsHelper.hasAnyHistoricalVector(selectedVectorNames);

    const selectedEnsembleIdentsAnnotations = useSelectedEnsembleIdentsAnnotations();
    const selectedParameterIdentStringAnnotations = useSelectedParameterIdentStringAnnotations();
    const resampleFrequencyWarningAnnotation = useResampleFrequencyWarningAnnotation();
    const vectorListQueriesErrorAnnotation = useVectorListQueriesErrorAnnotation();

    return (
        <Collapsible.ScrollArea>
            <Collapsible.Group title="Data" defaultOpen>
                <Collapsible.Content layoutClassName="flex flex-col gap-vertical-sm">
                    <SettingWrapper label="Ensembles" annotations={selectedEnsembleIdentsAnnotations}>
                        <EnsemblePicker
                            ensembles={ensembleSet.getEnsembleArray()}
                            value={selectedEnsembleIdents.value ?? []}
                            allowDeltaEnsembles={true}
                            ensembleRealizationFilterFunction={useEnsembleRealizationFilterFunc(props.workbenchSession)}
                            onChange={handleEnsembleSelectChange}
                        />
                    </SettingWrapper>
                    <Separator orientation="horizontal" />
                    <SettingWrapper
                        label={
                            <span className="gap-horizontal-2xs flex items-center">
                                Vectors
                                <span className="font-light">
                                    ({selectedVectorNames.length}/{50})
                                </span>
                            </span>
                        }
                        loadingOverlay={
                            isVectorListQueriesFetching || vectorListQueries.some((query) => query.isFetching)
                        }
                        errorAnnotation={vectorListQueriesErrorAnnotation}
                        contentClassName="flex flex-col gap-vertical-3xs"
                    >
                        <>
                            <div className="gap-y-vertical-xs gap-x-horizontal-xs flex flex-wrap">
                                <CheckboxCompositions.WithLabel
                                    label="Show historical"
                                    checked={showHistorical}
                                    disabled={!selectedVectorNamesHasHistorical}
                                    onCheckedChange={(checked) => handleShowHistorical(checked)}
                                    size="small"
                                />
                                <CheckboxCompositions.WithLabel
                                    label="Show observations"
                                    checked={showObservations}
                                    onCheckedChange={handleShowObservations}
                                    size="small"
                                />
                            </div>
                            <VectorSelector
                                data={vectorSelectorData}
                                placeholder="Add new vector..."
                                maxNumSelectedNodes={50}
                                numSecondsUntilSuggestionsAreShown={0.5}
                                onChange={handleVectorSelectionChange}
                                customVectorDefinitions={customVectorDefinitions ?? undefined}
                                selectedTags={selectedVectorTags}
                            />
                        </>
                    </SettingWrapper>
                    <Separator orientation="horizontal" />
                    <SettingWrapper label="Resampling frequency" warningAnnotation={resampleFrequencyWarningAnnotation}>
                        <Combobox
                            items={[
                                { value: "RAW", label: "None (Raw)" },
                                ...Object.values(Frequency_api).map((val: Frequency_api) => {
                                    return { value: val, label: FrequencyEnumToStringMapping[val] };
                                }),
                            ]}
                            value={resampleFrequency ?? "RAW"}
                            onValueChange={handleFrequencySelectionChange}
                        />
                    </SettingWrapper>
                </Collapsible.Content>
            </Collapsible.Group>
            <Collapsible.Group title="Plot settings" defaultOpen>
                <Collapsible.Content layoutClassName="flex flex-col gap-vertical-sm">
                    <FieldCompositions.Default label="Limit subplots by">
                        <div className="gap-horizontal-xs flex w-full min-w-0 items-center">
                            <Combobox
                                items={Object.values(SubplotLimitDirection).map((val: SubplotLimitDirection) => {
                                    return { value: val, label: SubplotLimitDirectionEnumToStringMapping[val] };
                                })}
                                value={subplotLimitDirection}
                                onValueChange={handleSubplotLimitDirectionChange}
                            />
                            <div className="min-w-0 grow">
                                <NumberInput
                                    value={subplotMaxDirectionElements}
                                    disabled={subplotLimitDirection === SubplotLimitDirection.NONE}
                                    min={1}
                                    max={12}
                                    onValueChange={debouncedHandleSubplotMaxDirectionElementsChange}
                                />
                            </div>
                        </div>
                    </FieldCompositions.Default>
                    <Separator orientation="horizontal" />
                    <FieldCompositions.Default label="Group by">
                        <RadioCompositions.GroupWithLabels
                            value={groupBy}
                            options={Object.values(GroupBy).map((val: GroupBy) => {
                                return { value: val, label: GroupByEnumToStringMapping[val] };
                            })}
                            onValueChange={(value) => handleGroupByChange(value)}
                            layout="horizontal"
                            size="small"
                        />
                    </FieldCompositions.Default>
                </Collapsible.Content>
            </Collapsible.Group>
            <Collapsible.Group title="Visualization" defaultOpen>
                <Collapsible.Content layoutClassName="flex flex-col gap-vertical-sm">
                    <RadioCompositions.GroupWithLabels
                        value={visualizationMode}
                        options={Object.values(VisualizationMode).map((val: VisualizationMode) => {
                            return { value: val, label: VisualizationModeEnumToStringMapping[val] };
                        })}
                        onValueChange={(value) => handleVisualizationModeChange(value)}
                        size="small"
                    />
                    <Hidden hidden={visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS}>
                        <Separator orientation="horizontal" />
                        <SettingWrapper label="Statistic options">
                            <>{makeStatisticCheckboxes()}</>
                        </SettingWrapper>
                    </Hidden>
                </Collapsible.Content>
            </Collapsible.Group>
            <Hidden hidden={visualizationMode !== VisualizationMode.INDIVIDUAL_REALIZATIONS}>
                <Collapsible.Group
                    title="Color realizations by parameter"
                    defaultOpen
                    adornment={
                        <TooltipCompositions.Default content="Enable to color the individual realizations based on the value of a selected parameter. The parameter can be selected in the collapsible section below.">
                            <Switch
                                checked={colorRealizationsByParameter}
                                onCheckedChange={setColorRealizationsByParameter}
                            />
                        </TooltipCompositions.Default>
                    }
                >
                    <Collapsible.Content layoutClassName="flex flex-col gap-vertical-xs">
                        <div
                            className={resolveClassNames({
                                "pointer-events-none opacity-70":
                                    !colorRealizationsByParameter ||
                                    visualizationMode !== VisualizationMode.INDIVIDUAL_REALIZATIONS,
                            })}
                        >
                            <div className="gap-vertical-xs flex flex-col">
                                <div className="gap-horizontal-xs flex items-center justify-center shadow-xs">
                                    <h3 className="grow text-sm leading-none font-semibold">Select Parameter</h3>
                                    <Toggle.Button
                                        title="Filter list of parameters"
                                        pressed={showParameterListFilter}
                                        buttonProps={{ size: "small", iconOnly: true }}
                                        onClick={() => setShowParameterListFilter((prev) => !prev)}
                                    >
                                        <FilterAlt fontSize="small" />
                                    </Toggle.Button>
                                </div>
                                <Label text="Filter parameters on selection">
                                    <ParameterListFilter
                                        parameters={continuousAndNonConstantParametersUnion}
                                        initialFilters={["Continuous", "Nonconstant"]}
                                        onChange={handleParameterListFilterChange}
                                    />
                                </Label>
                                <div className={`${showParameterListFilter ? "pt-3" : "pt-1"}`}>
                                    <SettingWrapper annotations={selectedParameterIdentStringAnnotations}>
                                        <Select
                                            options={filteredParameterIdentList.map((elm) => ({
                                                value: elm.toString(),
                                                label: elm.groupName ? `${elm.groupName}:${elm.name}` : elm.name,
                                            }))}
                                            size={6}
                                            value={
                                                selectedParameterIdentStr.value
                                                    ? [selectedParameterIdentStr.value]
                                                    : undefined
                                            }
                                            onChange={handleColorByParameterChange}
                                        />
                                    </SettingWrapper>
                                </div>
                            </div>
                        </div>
                    </Collapsible.Content>
                </Collapsible.Group>
            </Hidden>
        </Collapsible.ScrollArea>
    );
}
