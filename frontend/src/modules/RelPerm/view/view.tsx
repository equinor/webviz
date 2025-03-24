import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { useAtomValue } from "jotai";

import { queryIsFetchingAtom, realizationsQueryHasErrorAtom } from "./atoms/derivedAtoms";
import { usePlotBuilder } from "./hooks/usePlotBuilder";

import { Interfaces } from "../interfaces";

export const View = ({ viewContext, workbenchSettings, workbenchSession }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const plot = usePlotBuilder(viewContext, workbenchSession, workbenchSettings, wrapperDivSize);

    const statusWriter = useViewStatusWriter(viewContext);
    const isQueryFetching = useAtomValue(queryIsFetchingAtom);
    statusWriter.setLoading(isQueryFetching);

    const hasRealizationDataQueryError = useAtomValue(realizationsQueryHasErrorAtom);
    if (hasRealizationDataQueryError) {
        statusWriter.addError("One or more realization data queries have an error state.");
    }
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {!hasRealizationDataQueryError ? (
                plot
            ) : (
                <ContentError>One or more queries have an error state.</ContentError>
            )}
        </div>
    );
};
