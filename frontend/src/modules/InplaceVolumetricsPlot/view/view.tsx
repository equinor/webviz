import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

import { useAtomValue } from "jotai";

import { resultNameAtom } from "./atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "./atoms/queryAtoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { useBuildPlotAndTable } from "./hooks/usePlotBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";

import { Interfaces } from "../interfaces";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const colorSet = props.workbenchSettings.useColorSet();

    const hoveredRegion = useSubscribedValue("global.hoverRegion", props.workbenchServices);
    const hoveredZone = useSubscribedValue("global.hoverZone", props.workbenchServices);
    const hoveredFacies = useSubscribedValue("global.hoverFacies", props.workbenchServices);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const resultName = useAtomValue(resultNameAtom);
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);

    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);
    useMakeViewStatusWriterMessages(statusWriter);

    const plotAndTableData = useBuildPlotAndTable(
        props.viewContext,
        ensembleSet,
        colorSet,
        divBoundingRect.width,
        divBoundingRect.height,
        hoveredRegion?.regionName ?? null,
        hoveredZone?.zoneName ?? null,
        hoveredFacies?.faciesName ?? null
    );

    const table = plotAndTableData?.table;
    const plots = plotAndTableData?.plots;

    usePublishToDataChannels(props.viewContext, ensembleSet, table, resultName ?? undefined);

    return (
        <div ref={divRef} className="w-full h-full relative">
            <PendingWrapper
                isPending={aggregatedTableDataQueries.isFetching}
                errorMessage={
                    aggregatedTableDataQueries.allQueriesFailed
                        ? "Failed to load aggregated volumetric data"
                        : undefined
                }
            >
                {plots ?? <div style={{ height: divBoundingRect.height }} />}
            </PendingWrapper>
        </div>
    );
}
