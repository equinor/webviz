import React from "react";

import { Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { isEqual } from "lodash-es";

import { getCasesOptions, getAssetInfosOptions, type EnsembleInfo_api } from "@api";
import type { UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { useRefreshQuery } from "@framework/internal/hooks/useRefreshQuery";
import { tanstackDebugTimeOverride } from "@framework/utils/debug";
import { Tooltip } from "@lib/components/Tooltip";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { useValidState } from "@lib/hooks/useValidState";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { Combobox } from "@lib/newComponents/Combobox";
import { Field } from "@lib/newComponents/Field";
import { FieldCompositions } from "@lib/newComponents/Field/compositions";
import { StatusWrapper } from "@lib/newComponents/StatusWrapper";
import { SwitchCompositions } from "@lib/newComponents/Switch/compositions";
import { TimeAgo } from "@lib/newComponents/TimeAgo/timeAgo";

import { readInitialStateFromLocalStorage, storeStateInLocalStorage } from "./_utils";
import { CaseTable } from "./CaseTable";

const STALE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);
const CACHE_TIME = tanstackDebugTimeOverride(5 * 60 * 1000);

export type CaseSelection = {
    caseName: string;
    caseUuid: string;
    filteredEnsembles: EnsembleInfo_api[];
};

export type CaseExplorerProps = {
    queriesDisabled: boolean;
    selectedEnsembles: UserEnsembleSetting[];
    onCaseSelectionChange: (caseSelection: CaseSelection | null) => void;
};
export function CaseExplorer(props: CaseExplorerProps): React.ReactNode {
    const { onCaseSelectionChange } = props;

    // --- State ---
    const [numberOfCases, setNumberOfCases] = React.useState<number>(0);

    const [showOnlyMyCases, setShowOnlyMyCases] = React.useState<boolean>(
        readInitialStateFromLocalStorage("showOnlyMyCases") === "true",
    );
    const [showOnlyOfficialCases, setShowOnlyOfficialCases] = React.useState<boolean>(
        readInitialStateFromLocalStorage("showOfficialCases") === "true",
    );

    // Have without fixup to allow resetting to null when table filters out selected case
    const [selectedCaseUuid, setSelectedCaseUuid] = React.useState<string | null>(null);

    // Keep the prevCaseSelection state that was already defined
    const [prevCaseSelection, setPrevCaseSelection] = React.useState<CaseSelection | null>(null);

    // --- Queries ---
    const assetsQuery = useQuery({
        ...getAssetInfosOptions(),
        enabled: !props.queriesDisabled,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
        refetchOnMount: "always", // Set to "always" to ensure data is fresh on mount
    });

    const [selectedAsset, setSelectedAsset] = useValidState<string>({
        initialState: readInitialStateFromLocalStorage("selectedAsset"),
        validStates: assetsQuery.data?.map((item) => item.name) ?? [],
        keepStateWhenInvalid: true,
    });

    const casesQuery = useQuery({
        ...getCasesOptions({ query: { asset_name: selectedAsset ?? "" } }),
        enabled: !!selectedAsset && !props.queriesDisabled,
        gcTime: CACHE_TIME,
        staleTime: STALE_TIME,
        refetchOnMount: "always", // Set to "always" to ensure data is fresh on mount
    });

    // Ensure valid selected case uuid, use casesQuery data to utilize fetching state
    React.useEffect(
        function ensureValidSelectedCaseUuid() {
            if (selectedCaseUuid && casesQuery.data && !casesQuery.data.some((c) => c.uuid === selectedCaseUuid)) {
                setSelectedCaseUuid(null);
            }
        },
        [selectedCaseUuid, casesQuery.data],
    );

    // Refresh query handlers
    const { isRefreshing: isAssetsQueryRefreshing, refresh: refreshAssets } = useRefreshQuery(assetsQuery);
    const { isRefreshing: isCasesQueryRefreshing, refresh: refreshCases } = useRefreshQuery(casesQuery);

    // --- Derived data ---
    const assetOptions = assetsQuery.data?.map((f) => ({ value: f.name, label: f.name })) ?? [];

    const lastUpdatedMs = React.useMemo(() => {
        return casesQuery.data && casesQuery.dataUpdatedAt ? casesQuery.dataUpdatedAt : null;
    }, [casesQuery.data, casesQuery.dataUpdatedAt]);

    // Extract unique standard results from cases data when it's available
    const casesStandardResults = React.useMemo(() => {
        if (!casesQuery.data) {
            return [];
        }

        const standardResults = new Set<string>();
        for (const c of casesQuery.data) {
            c.ensembles.forEach((ens) => {
                ens.standardResults.forEach((res) => {
                    standardResults.add(res);
                });
            });
        }

        return Array.from(standardResults).sort();
    }, [casesQuery.data]);

    const [selectedStandardResults, setSelectedStandardResults] = useValidArrayState<string>({
        initialState: [],
        validStateArray: casesStandardResults,
        keepStateWhenInvalid: !casesQuery.data, // Requires valid state when data is available, allows invalid while data is fetching
    });

    const caseData = React.useMemo(() => {
        if (!casesQuery.data) {
            return [];
        }

        let cases = casesQuery.data;
        if (selectedStandardResults.length > 0) {
            cases = cases.filter((c) =>
                c.ensembles.some((ens) => ens.standardResults.some((res) => selectedStandardResults.includes(res))),
            );
        }

        return cases;
    }, [casesQuery.data, selectedStandardResults]);

    const currentCaseSelection: CaseSelection | null = React.useMemo(() => {
        if (!selectedCaseUuid) {
            return null;
        }

        const selectedCase = casesQuery.data?.find((c) => c.uuid === selectedCaseUuid);
        if (!selectedCase) {
            return null;
        }

        const selectedCaseFilteredEnsembles =
            selectedStandardResults.length === 0
                ? selectedCase.ensembles
                : selectedCase.ensembles.filter((ens) =>
                      ens.standardResults.some((res) => selectedStandardResults.includes(res)),
                  );

        return {
            caseName: selectedCase.name,
            caseUuid: selectedCaseUuid,
            filteredEnsembles: selectedCaseFilteredEnsembles,
        };
    }, [casesQuery.data, selectedCaseUuid, selectedStandardResults]);

    // Add useEffect that compares with previous selection before calling the callback
    React.useEffect(() => {
        if (!isEqual(currentCaseSelection, prevCaseSelection)) {
            setPrevCaseSelection(currentCaseSelection);
            onCaseSelectionChange(currentCaseSelection);
        }
    }, [currentCaseSelection, onCaseSelectionChange, prevCaseSelection]);

    // --- Handlers ---
    function handleAssetChanged(assetName: string | null) {
        if (!assetName) {
            return;
        }

        storeStateInLocalStorage("selectedAsset", assetName);
        setSelectedAsset(assetName);
    }

    function handleOfficialCasesSwitchChange(checked: boolean) {
        setShowOnlyOfficialCases(checked);
        storeStateInLocalStorage("showOfficialCases", checked.toString());
    }

    function handleCasesByMeChange(checked: boolean) {
        setShowOnlyMyCases(checked);
        storeStateInLocalStorage("showOnlyMyCases", checked.toString());
    }

    const handleManualRefetch = React.useCallback(
        function handleManualRefetch() {
            // Checking if queries are disabled or already isFetching (covers both fetching and re-fetching state)
            if (props.queriesDisabled || casesQuery.isFetching || assetsQuery.isFetching) return;

            refreshAssets();
            refreshCases();
        },
        [refreshCases, refreshAssets, props.queriesDisabled, casesQuery.isFetching, assetsQuery.isFetching],
    );

    return (
        <Field.Root layoutClassName="w-full gap-y-3xs flex h-full min-h-0 flex-col">
            <div className="gap-x-sm flex w-full items-center">
                <Field.Label indicator={`(${numberOfCases})`} itemID="">
                    Cases
                </Field.Label>
                <span className="grow" />
                <span className="text-body-xs text-neutral-subtle italic">
                    Last updated:{" "}
                    {lastUpdatedMs ? (
                        <TimeAgo datetimeMs={lastUpdatedMs} updateIntervalMs={10000} />
                    ) : casesQuery.isFetching ? (
                        "Loading..."
                    ) : (
                        "Never"
                    )}
                </span>
                <Tooltip title="Refresh assets and cases lists" enterDelay="medium">
                    <Button tone="accent" onClick={handleManualRefetch} variant="ghost">
                        {isAssetsQueryRefreshing || isCasesQueryRefreshing ? (
                            <CircularProgress size={16} />
                        ) : (
                            <Refresh style={{ fontSize: 16 }} />
                        )}
                        Refresh
                    </Button>
                </Tooltip>
            </div>
            <div className="gap-x-xs flex w-full flex-row">
                <FieldCompositions.Default gridLayout={true} label="Asset">
                    <StatusWrapper
                        isPending={assetsQuery.isFetching && !assetsQuery.isRefetching}
                        errorMessage={assetsQuery.error ? "Error loading assets" : undefined}
                    >
                        <Combobox
                            items={assetOptions}
                            value={selectedAsset}
                            onValueChange={handleAssetChanged}
                            disabled={assetOptions.length === 0}
                        />
                    </StatusWrapper>
                </FieldCompositions.Default>
                <Tooltip title="Show only cases authored by me" enterDelay="medium">
                    <SwitchCompositions.WithLabel
                        checked={showOnlyMyCases}
                        onCheckedChange={handleCasesByMeChange}
                        label="Only my cases"
                    />
                </Tooltip>
                <Tooltip title="Show only cases marked as official" enterDelay="medium">
                    <SwitchCompositions.WithLabel
                        checked={showOnlyOfficialCases}
                        onCheckedChange={handleOfficialCasesSwitchChange}
                        label="Only Official cases"
                    />
                </Tooltip>
                <StatusWrapper
                    isPending={casesQuery.isFetching && !casesQuery.isRefetching}
                    errorMessage={casesQuery.error ? "Error loading cases" : undefined}
                    className="h-full min-h-0 min-w-56 flex-1"
                >
                    <Tooltip title="Filter cases by selected Standard Results" enterDelay="medium">
                        <Combobox
                            value={selectedStandardResults}
                            placeholder="Standard Results"
                            multiple
                            items={casesStandardResults.map((elm) => ({ value: elm, label: elm }))}
                            disabled={casesStandardResults.length === 0}
                            onValueChange={(value) => value && setSelectedStandardResults([...value])}
                            clearable
                        />
                    </Tooltip>
                </StatusWrapper>
            </div>
            <StatusWrapper
                className="min-h-0 grow"
                errorMessage={casesQuery.isError ? "Error loading cases" : undefined}
                isPending={casesQuery.isFetching && !casesQuery.isRefetching}
            >
                <CaseTable
                    caseData={caseData}
                    isPending={casesQuery.isPending}
                    selectedCase={selectedCaseUuid}
                    selectedEnsembles={props.selectedEnsembles}
                    showOnlyMyCases={showOnlyMyCases}
                    showOnlyOfficialCases={showOnlyOfficialCases}
                    onCaseSelected={setSelectedCaseUuid}
                    onDataCollated={(data) => setNumberOfCases(data.length)}
                />
            </StatusWrapper>
        </Field.Root>
    );
}
