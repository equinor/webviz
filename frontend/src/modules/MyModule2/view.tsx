import React from "react";

import { ModuleFCProps } from "@framework/Module";

import { useAtom } from "jotai";

import { atomBasedOnVectors, ensembleSetDependentAtom } from "./atoms";
import { State } from "./state";

export const View = (props: ModuleFCProps<State>) => {
    const [isFetching] = useAtom(atomBasedOnVectors);

    const [firstEnsemble] = useAtom(ensembleSetDependentAtom);

    return (
        <div className="h-full w-full flex flex-col justify-center items-center">
            {firstEnsemble?.toString()}
            {isFetching ? (
                <div>Settings is loading...</div>
            ) : (
                <div className="text-4xl font-bold">Settings is ready</div>
            )}
        </div>
    );
};

View.displayName = "View";
