import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

import { useAtomValue } from "jotai";

import { areSelectedTablesComparableAtom, resultNameAtom } from "./atoms/baseAtoms";
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
    const areSelectedTablesComparable = useAtomValue(areSelectedTablesComparableAtom);

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

    function createErrorMessage(): string | null {
        if (aggregatedTableDataQueries.allQueriesFailed) {
            return "Failed to load volumetric table data";
        }
        if (!areSelectedTablesComparable) {
            return "Selected volumetric tables are not comparable";
        }

        return null;
    }

    // If a user selects a single table first and initiates a fetch but then selects a set of tables that are not comparable,
    // we don't want to show that the module is pending, but rather immediately show the error message that the tables are not comparable.
    // The query is still fetching, but we don't want to show the pending state.
    const isPending = aggregatedTableDataQueries.isFetching && areSelectedTablesComparable;

    return (
        <div ref={divRef} className="w-full h-full relative">
            <PendingWrapper isPending={isPending} errorMessage={createErrorMessage() ?? undefined}>
                {plots ?? <div style={{ height: divBoundingRect.height }} />}
            </PendingWrapper>
        </div>
    );
}
