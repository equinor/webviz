import React from "react";

import { ModuleFCProps } from "@framework/Module";

import { atomBasedOnVectors, ensembleSetDependentAtom } from "./atoms";
import { State } from "./state";

export const View = (props: ModuleFCProps<State>) => {
    const [isFetching] = props.moduleContext.useAtom(atomBasedOnVectors);

    const [firstEnsemble] = props.moduleContext.useAtom(ensembleSetDependentAtom);

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
