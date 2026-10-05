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

// The dev "longtask" endpoint has no generated SDK function (not in the OpenAPI schema), but still goes
// through TanStack Query with the abort `signal` - so evicting the dashboard cancels a request in flight
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
    const settingsStateData = React.useMemo(
        () => (storeInSettingsState ? makeDummyData(sizeMb) : null),
        [storeInSettingsState, sizeMb],
    );

    // Set on each button press - the duration is captured then, so editing the input afterwards doesn't
    // fire a new request. The run id gives each press a fresh query key.
    const [longTaskRequest, setLongTaskRequest] = React.useState<{ runId: number; durationS: number } | null>(null);

    function handleSendLongTaskClick() {
        setLongTaskRequest((prev) => ({
            runId: (prev?.runId ?? 0) + 1,
            durationS: Math.max(0, Math.floor(longTaskDurationS)),
        }));
    }

    const longTaskQuery = useQuery({
        queryKey: ["dbg-perf-test-longtask", longTaskRequest?.runId, longTaskRequest?.durationS],
        queryFn: ({ signal }) => fetchLongTask(longTaskRequest?.durationS ?? 0, signal),
        enabled: longTaskRequest !== null,
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
                            onClick={handleSendLongTaskClick}
                            disabled={longTaskQuery.isFetching}
                        >
                            {longTaskQuery.isFetching ? "Waiting for backend…" : "Send GET /dev/longtask"}
                        </Button>
                    </Setting.Field>
                    <div className="text-sm text-gray-600">
                        {longTaskRequest === null && "No request sent yet."}
                        {longTaskRequest !== null && longTaskQuery.isFetching && "Request in flight…"}
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
