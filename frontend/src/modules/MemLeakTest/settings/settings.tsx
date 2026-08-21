import React from "react";

import { useAtom } from "jotai";

import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { SwitchCompositions } from "@lib/components/Switch/compositions";

import { makeDummyData } from "../_utils/makeDummyData";
import {
    sizeMbAtom,
    storeInAtomStoreAtom,
    storeInQueryCacheAtom,
    storeInSettingsStateAtom,
    storeInViewStateAtom,
} from "../atoms/baseAtoms";

export function Settings(): React.ReactNode {
    const [sizeMb, setSizeMb] = useAtom(sizeMbAtom);
    const [storeInAtomStore, setStoreInAtomStore] = useAtom(storeInAtomStoreAtom);
    const [storeInQueryCache, setStoreInQueryCache] = useAtom(storeInQueryCacheAtom);
    const [storeInSettingsState, setStoreInSettingsState] = useAtom(storeInSettingsStateAtom);
    const [storeInViewState, setStoreInViewState] = useAtom(storeInViewStateAtom);

    // Local component state, deliberately not routed through the atom store, to test whether
    // React state held by the settings component leaks past module instance teardown.
    const [settingsStateData, setSettingsStateData] = React.useState<Float64Array | null>(null);

    React.useEffect(
        function allocateOrClearSettingsStateData() {
            setSettingsStateData(storeInSettingsState ? makeDummyData(sizeMb) : null);
        },
        [storeInSettingsState, sizeMb],
    );

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
                <Setting.Section title="Status" defaultOpen>
                    <div className="text-sm text-gray-600">
                        Settings-state array length: {settingsStateData?.length ?? 0}
                    </div>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}
