import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import {
    userSelectedAggregateBySelectionsAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedFaciesAtom,
    userSelectedRegionsAtom,
    userSelectedResponsesAtom,
    userSelectedTableSourcesAtom,
    userSelectedTableTypeAtom,
    userSelectedZonesAtom,
} from "./atom/baseAtoms";
import {
    availableInplaceVolumetricsIndicesAtom,
    availableResponsesAtom,
    availableTableSourceAtom,
    queriesStatusAtom,
    selectedEnsembleIdentsAtom,
    selectedFaciesAtom,
    selectedRegionsAtom,
    selectedResponsesAtom,
    selectedTableSourcesAtom,
    selectedZonesAtom,
} from "./atom/derivedAtoms";
import { useMakeSettingsStatusWriterMessages } from "./hooks/useMakeSettingsStatusWriterMessages";

import { Interface } from "../settingsToViewInterface";
import { State } from "../state";
import {
    AggregateByOption,
    AggregateByOptionToStringMapping,
    InplaceVolumetricsTableType,
    InplaceVolumetricsTableTypeToStringMapping,
    QueriesStatus,
} from "../types";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<State, Interface>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const setUserSelectedEnsembleIdents = useSetAtom(userSelectedEnsembleIdentsAtom);

    const queriesStatus = useAtomValue(queriesStatusAtom);

    const [userSelectedTableType, setUserSelectedTableType] = useAtom(userSelectedTableTypeAtom);
    const [userSelectedAggregateBySelections, setUserSelectedAggregateBySelections] = useAtom(
        userSelectedAggregateBySelectionsAtom
    );

    const availableInplaceVolumetricsIndices = useAtomValue(availableInplaceVolumetricsIndicesAtom);
    const availableTableSources = useAtomValue(availableTableSourceAtom);
    const availableResponses = useAtomValue(availableResponsesAtom);

    const selectedTableSources = useAtomValue(selectedTableSourcesAtom);
    const setUserSelectedTableSources = useSetAtom(userSelectedTableSourcesAtom);
    const selectedResponses = useAtomValue(selectedResponsesAtom);
    const setUserSelectedResponses = useSetAtom(userSelectedResponsesAtom);
    const selectedZones = useAtomValue(selectedZonesAtom);
    const setUserSelectedZones = useSetAtom(userSelectedZonesAtom);
    const selectedRegions = useAtomValue(selectedRegionsAtom);
    const setUserSelectedRegions = useSetAtom(userSelectedRegionsAtom);
    const selectedFacies = useAtomValue(selectedFaciesAtom);
    const setUserSelectedFacies = useSetAtom(userSelectedFaciesAtom);

    useMakeSettingsStatusWriterMessages(statusWriter);

    function handleEnsembleSelectChange(ensembleSet: EnsembleIdent[]) {
        setUserSelectedEnsembleIdents(ensembleSet);
    }

    function handleSelectedTableTypeChange(tableType: string) {
        setUserSelectedTableType(tableType as InplaceVolumetricsTableType);
    }

    function handleResponseSelectChange(responses: string[]) {
        setUserSelectedResponses(responses);
    }

    function handleZoneSelectChange(zones: string[]) {
        setUserSelectedZones(zones);
    }

    function handleRegionSelectChange(regions: string[]) {
        setUserSelectedRegions(regions);
    }

    function handleFaciesSelectChange(facies: string[]) {
        setUserSelectedFacies(facies);
    }

    function handleAggregateBySelectChange(aggregateBy: string[]) {
        const newAggregateBy = [];
        for (const val of aggregateBy) {
            newAggregateBy.push(val as AggregateByOption);
        }
        setUserSelectedAggregateBySelections(newAggregateBy);
    }

    let queriesErrorMessage: string | undefined = undefined;
    if (queriesStatus === QueriesStatus.AllFailed) {
        queriesErrorMessage = "No inplace volumetrics table definitions found";
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Ensemble" expanded={true}>
                <div className="flex flex-col gap-2">
                    <Label text="Ensemble">
                        <EnsembleSelect
                            ensembleSet={ensembleSet}
                            value={selectedEnsembleIdents}
                            onChange={handleEnsembleSelectChange}
                            size={5}
                            multiple={true}
                        />
                    </Label>

                    <PendingWrapper
                        isPending={queriesStatus === QueriesStatus.Loading}
                        errorMessage={queriesErrorMessage}
                    >
                        <Label text="Table Source">
                            <Select
                                multiple={true}
                                size={5}
                                options={availableTableSources.map((source) => {
                                    return { value: source, label: source };
                                })}
                                value={selectedTableSources}
                                onChange={setUserSelectedTableSources}
                            />
                        </Label>
                    </PendingWrapper>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Table Selections" expanded={true}>
                <div className="flex flex-col gap-2">
                    <Label text="Table Type">
                        <Dropdown
                            value={userSelectedTableType}
                            options={Object.values(InplaceVolumetricsTableType).map(
                                (val: InplaceVolumetricsTableType) => {
                                    return { value: val, label: InplaceVolumetricsTableTypeToStringMapping[val] };
                                }
                            )}
                            onChange={handleSelectedTableTypeChange}
                        />
                    </Label>
                    <Label text="Aggregate By Each">
                        <Select
                            multiple={true}
                            size={5}
                            options={Object.values(AggregateByOption).map((val: AggregateByOption) => {
                                return { value: val, label: AggregateByOptionToStringMapping[val] };
                            })}
                            value={userSelectedAggregateBySelections}
                            onChange={handleAggregateBySelectChange}
                        />
                    </Label>
                    <Label text="Responses">
                        <Select
                            multiple={true}
                            size={10}
                            options={availableResponses.map((response) => {
                                return { value: response, label: response };
                            })}
                            value={selectedResponses}
                            onChange={handleResponseSelectChange}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Selections" expanded={true}>
                <PendingWrapper isPending={queriesStatus === QueriesStatus.Loading} errorMessage={queriesErrorMessage}>
                    <div className="flex flex-col gap-2">
                        <Label text="Zone">
                            <Select
                                multiple={true}
                                size={5}
                                value={selectedZones}
                                options={availableInplaceVolumetricsIndices.zones.map((zone) => {
                                    return { value: zone, label: zone };
                                })}
                                onChange={handleZoneSelectChange}
                            />
                        </Label>
                        <Label text="Region">
                            <Select
                                multiple={true}
                                size={5}
                                value={selectedRegions}
                                options={availableInplaceVolumetricsIndices.regions.map((region) => {
                                    return { value: region, label: region };
                                })}
                                onChange={handleRegionSelectChange}
                            />
                        </Label>
                        <Label text="Facies">
                            <Select
                                multiple={true}
                                size={5}
                                value={selectedFacies}
                                options={availableInplaceVolumetricsIndices.facies.map((facies) => {
                                    return { value: facies, label: facies };
                                })}
                                onChange={handleFaciesSelectChange}
                            />
                        </Label>
                    </div>
                </PendingWrapper>
            </CollapsibleGroup>
        </div>
    );
}
