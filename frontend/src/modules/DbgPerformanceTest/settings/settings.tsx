import React from "react";

import { useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { client } from "@api";
import { Button } from "@lib/components/Button";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { SwitchCompositions } from "@lib/components/Switch/compositions";

import { makeDummyData } from "../_utils/makeDummyData";
import {
    longTaskDurationSAtom,
    sizeMbAtom,
    storeInAtomStoreAtom,
    storeInQueryCacheAtom,
    storeInSettingsStateAtom,
    storeInViewStateAtom,
} from "../atoms/baseAtoms";

type LongTaskResult = {
    elapsedMs: number;
    response: string;
};

// The dev "longtask" endpoint is not part of the generated OpenAPI schema (include_in_schema=False),
// so it has no generated SDK function - but the request still goes through TanStack Query (queryFn
// below) rather than being fired imperatively, so its lifecycle is tied to this component: the
// `signal` is forwarded to axios, and when the module instance unmounts (e.g. its dashboard is
// evicted from the hot cache) TanStack Query aborts the in-flight request instead of letting it run
// to completion.
async function fetchLongTask(durationS: number, signal: AbortSignal): Promise<LongTaskResult> {
    const startedAt = performance.now();
    const { data, error } = await client.get<string>({ url: `/dev/longtask/${durationS}`, signal });
    if (error) {
        throw error instanceof Error ? error : new Error(JSON.stringify(error));
    }
    return { elapsedMs: Math.round(performance.now() - startedAt), response: String(data) };
}

export function Settings(): React.ReactNode {
    const [sizeMb, setSizeMb] = useAtom(sizeMbAtom);
    const [storeInAtomStore, setStoreInAtomStore] = useAtom(storeInAtomStoreAtom);
    const [storeInQueryCache, setStoreInQueryCache] = useAtom(storeInQueryCacheAtom);
    const [storeInSettingsState, setStoreInSettingsState] = useAtom(storeInSettingsStateAtom);
    const [storeInViewState, setStoreInViewState] = useAtom(storeInViewStateAtom);
    const [longTaskDurationS, setLongTaskDurationS] = useAtom(longTaskDurationSAtom);

    // Local component state, deliberately not routed through the atom store, to test whether
    // React state held by the settings component leaks past module instance teardown.
    const [settingsStateData, setSettingsStateData] = React.useState<Float64Array | null>(null);

    // Bumped on each button press so the query below re-runs with a fresh key.
    const [longTaskRunId, setLongTaskRunId] = React.useState(0);

    React.useEffect(
        function allocateOrClearSettingsStateData() {
            setSettingsStateData(storeInSettingsState ? makeDummyData(sizeMb) : null);
        },
        [storeInSettingsState, sizeMb],
    );

    const longTaskDurationClamped = Math.max(0, Math.floor(longTaskDurationS));

    const longTaskQuery = useQuery({
        queryKey: ["dbg-perf-test-longtask", longTaskRunId, longTaskDurationClamped],
        queryFn: ({ signal }) => fetchLongTask(longTaskDurationClamped, signal),
        enabled: longTaskRunId > 0,
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
    });

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Dummy data configuration" defaultOpen>
                    <Setting.Field label="Size per location (MB)" stacked>
                        <NumberInput
                            value={sizeMb}
                            onValueChange={(value) => setSizeMb(value ?? 1)}
                            min={1}
                            max={2000}
                        />
                    </Setting.Field>
                    <Setting.Field label="Store in atom store">
                        <SwitchCompositions.WithLabel
                            checked={storeInAtomStore}
                            onCheckedChange={setStoreInAtomStore}
                            label={storeInAtomStore ? "Allocated" : "Off"}
                        />
                    </Setting.Field>
                    <Setting.Field label="Store in TanStack Query cache">
                        <SwitchCompositions.WithLabel
                            checked={storeInQueryCache}
                            onCheckedChange={setStoreInQueryCache}
                            label={storeInQueryCache ? "Allocated" : "Off"}
                        />
                    </Setting.Field>
                    <Setting.Field label="Store in React state (settings)">
                        <SwitchCompositions.WithLabel
                            checked={storeInSettingsState}
                            onCheckedChange={setStoreInSettingsState}
                            label={storeInSettingsState ? "Allocated" : "Off"}
                        />
                    </Setting.Field>
                    <Setting.Field label="Store in React state (view)">
                        <SwitchCompositions.WithLabel
                            checked={storeInViewState}
                            onCheckedChange={setStoreInViewState}
                            label={storeInViewState ? "Allocated" : "Off"}
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Backend long task" defaultOpen>
                    <Setting.Field label="Timeout / duration (s)" stacked>
                        <NumberInput
                            value={longTaskDurationS}
                            onValueChange={(value) => setLongTaskDurationS(value ?? 0)}
                            min={0}
                            max={600}
                        />
                    </Setting.Field>
                    <Setting.Field label="Trigger request" stacked>
                        <Button
                            variant="contained"
                            onClick={() => setLongTaskRunId((id) => id + 1)}
                            disabled={longTaskQuery.isFetching}
                        >
                            {longTaskQuery.isFetching ? "Waiting for backend…" : "Send GET /dev/longtask"}
                        </Button>
                    </Setting.Field>
                    <div className="text-sm text-gray-600">
                        {longTaskRunId === 0 && "No request sent yet."}
                        {longTaskRunId > 0 && longTaskQuery.isFetching && "Request in flight…"}
                        {longTaskQuery.isSuccess &&
                            !longTaskQuery.isFetching &&
                            `Done in ${longTaskQuery.data.elapsedMs} ms: ${longTaskQuery.data.response}`}
                        {longTaskQuery.isError &&
                            !longTaskQuery.isFetching &&
                            `Failed: ${longTaskQuery.error.message}`}
                    </div>
                </Setting.Section>
                <Setting.Section title="Status" defaultOpen>
                    <div className="text-sm text-gray-600">
                        Settings-state array length: {settingsStateData?.length ?? 0}
                    </div>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}
