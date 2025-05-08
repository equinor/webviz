import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentError } from "@modules/_shared/components/ContentMessage";

import { useAtomValue } from "jotai";

import {
    realizationQueryIsFetchingAtom,
    realizationsQueryHasErrorAtom,
    statisticsQueryHasErrorAtom,
    statisticsQueryIsFetchingAtom,
} from "./atoms/derivedAtoms";
import { usePlotBuilder } from "./hooks/usePlotBuilder";

import type { Interfaces } from "../interfaces";

export const View = ({ viewContext, workbenchSettings, workbenchSession }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const plot = usePlotBuilder(viewContext, workbenchSession, workbenchSettings, wrapperDivSize);

    const statusWriter = useViewStatusWriter(viewContext);
    const isRealizationQueryFetching = useAtomValue(realizationQueryIsFetchingAtom);
    const isStatisticalQueryFetching = useAtomValue(statisticsQueryIsFetchingAtom);
    statusWriter.setLoading(isRealizationQueryFetching || isStatisticalQueryFetching);

    const hasRealizationDataQueryError = useAtomValue(realizationsQueryHasErrorAtom);
    if (hasRealizationDataQueryError) {
        statusWriter.addError("One or more realization data queries have an error state.");
    }
    const hasStatisticalDataQueryError = useAtomValue(statisticsQueryHasErrorAtom);
    if (hasStatisticalDataQueryError) {
        statusWriter.addError("One or more statistical data queries have an error state.");
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
