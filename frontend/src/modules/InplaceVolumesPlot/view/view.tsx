import React from "react";

import { useAtomValue } from "jotai";

import { HoverTopic, useHoverValue } from "@framework/HoverService";
import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

import type { Interfaces } from "../interfaces";

import { colorByAtom, firstResultNameAtom } from "./atoms/baseAtoms";
import { areSelectedTablesComparableAtom } from "./atoms/derivedAtoms";
import { aggregatedTableDataQueriesAtom } from "./atoms/queryAtoms";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { useBuildPlotAndTable } from "./hooks/usePlotBuilder";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const colorSet = useColorSet(props.workbenchSettings);

    const moduleInstanceId = props.viewContext.getInstanceIdString();
    const hoveredRegion = useHoverValue(HoverTopic.REGION, props.hoverService, moduleInstanceId);
    const hoveredZone = useHoverValue(HoverTopic.ZONE, props.hoverService, moduleInstanceId);
    const hoveredFacies = useHoverValue(HoverTopic.FACIES, props.hoverService, moduleInstanceId);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divBoundingRect = useElementBoundingRect(divRef);

    const resultName = useAtomValue(firstResultNameAtom);
    const aggregatedTableDataQueries = useAtomValue(aggregatedTableDataQueriesAtom);
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);

    statusWriter.setLoading(aggregatedTableDataQueries.isFetching);
    useMakeViewStatusWriterMessages(statusWriter);
    const colorBy = useAtomValue(colorByAtom);
    const plotAndTableData = useBuildPlotAndTable(
        props.viewContext,
        ensembleSet,
        colorSet,
        divBoundingRect.width,
        divBoundingRect.height,
        hoveredRegion,
        hoveredZone,
        hoveredFacies,
    );

    const table = plotAndTableData?.table;
    const plots = plotAndTableData?.plots;

    usePublishToDataChannels(props.viewContext, ensembleSet, colorSet, colorBy, table, resultName ?? undefined);

    function createErrorMessage(): string | null {
        if (aggregatedTableDataQueries.allQueriesFailed) {
            return "Failed to load inplace volumes table data";
        }
        if (!areSelectedTablesComparable) {
            return "Selected inplace volumes tables are not comparable due to mismatching fluids, result names or index columns";
        }

        return null;
    }

    // If a user selects a single table first and initiates a fetch but then selects a set of tables that are not comparable,
    // we don't want to show that the module is pending, but rather immediately show the error message that the tables are not comparable.
    // The query is still fetching, but we don't want to show the pending state.
    const isPending = aggregatedTableDataQueries.isFetching && areSelectedTablesComparable;

    return (
        <div ref={divRef} className="relative h-full w-full">
            <StatusWrapper isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
                {plots ?? <div style={{ height: divBoundingRect.height }} />}
            </StatusWrapper>
        </div>
    );
}
