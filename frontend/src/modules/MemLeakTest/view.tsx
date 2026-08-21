import React from "react";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { v4 } from "uuid";

import { makeDummyData } from "./_utils/makeDummyData";
import {
    atomStoreDummyDataAtom,
    sizeMbAtom,
    storeInAtomStoreAtom,
    storeInQueryCacheAtom,
    storeInSettingsStateAtom,
    storeInViewStateAtom,
} from "./atoms/baseAtoms";

// Each allocator below is deliberately its own component (own function scope, own closures) so that
// toggling one location on/off never keeps another location's data alive via V8 closure-scope sharing
// (e.g. a queryFn and a jotai setter declared in the same function body can end up sharing one Context
// object - keeping one alive keeps the other's captured variables alive too, even if unrelated).

function AtomStoreAllocator(): null {
    const storeInAtomStore = useAtomValue(storeInAtomStoreAtom);
    const sizeMb = useAtomValue(sizeMbAtom);
    const setAtomStoreDummyData = useSetAtom(atomStoreDummyDataAtom);

    React.useEffect(
        function allocateOrClearAtomStoreData() {
            setAtomStoreDummyData(storeInAtomStore ? makeDummyData(sizeMb) : null);
        },
        [storeInAtomStore, sizeMb, setAtomStoreDummyData],
    );

    return null;
}

function QueryCacheAllocator(): React.ReactNode {
    const storeInQueryCache = useAtomValue(storeInQueryCacheAtom);
    const sizeMb = useAtomValue(sizeMbAtom);
    const instanceIdRef = React.useRef<string>(v4());

    const queryResult = useQuery({
        queryKey: ["mem-leak-test-dummy-data", instanceIdRef.current, sizeMb],
        queryFn: () => makeDummyData(sizeMb),
        enabled: storeInQueryCache,
        staleTime: Infinity,
        gcTime: storeInQueryCache ? Infinity : 0,
    });

    return (
        <li>TanStack Query cache: {storeInQueryCache ? (queryResult.isSuccess ? "allocated" : "loading") : "off"}</li>
    );
}

function ViewStateAllocator(): React.ReactNode {
    const storeInViewState = useAtomValue(storeInViewStateAtom);
    const sizeMb = useAtomValue(sizeMbAtom);

    // Local component state, deliberately not routed through the atom store, to test whether
    // React state held by the view component leaks past module instance teardown.
    const [viewStateData, setViewStateData] = React.useState<Float64Array | null>(null);

    React.useEffect(
        function allocateOrClearViewStateData() {
            setViewStateData(storeInViewState ? makeDummyData(sizeMb) : null);
        },
        [storeInViewState, sizeMb],
    );

    return (
        <li>React state (view): {storeInViewState ? `allocated (${viewStateData?.length ?? 0} elements)` : "off"}</li>
    );
}

export function View(): React.ReactNode {
    const sizeMb = useAtomValue(sizeMbAtom);
    const storeInAtomStore = useAtomValue(storeInAtomStoreAtom);
    const storeInSettingsState = useAtomValue(storeInSettingsStateAtom);

    return (
        <div className="flex h-full w-full flex-col gap-2 p-4">
            <AtomStoreAllocator />
            <div className="font-semibold">Memory Leak Test</div>
            <div className="text-sm">Size per enabled location: {sizeMb} MB</div>
            <ul className="text-sm">
                <li>Atom store: {storeInAtomStore ? "allocated" : "off"}</li>
                <QueryCacheAllocator />
                <li>React state (settings): {storeInSettingsState ? "allocated (see settings panel)" : "off"}</li>
                <ViewStateAllocator />
            </ul>
        </div>
    );
}
