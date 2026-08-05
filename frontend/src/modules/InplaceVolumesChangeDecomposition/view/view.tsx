import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";

import type { Interfaces } from "../interfaces";

import { useBuildWaterfallPlot } from "./hooks/useBuildWaterfallPlot";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);

    const plotDivRef = React.useRef<HTMLDivElement>(null);
    const plotDivBoundingRect = useElementBoundingRect(plotDivRef);

    const waterfall = useBuildWaterfallPlot(ensembleSet, plotDivBoundingRect.width, plotDivBoundingRect.height);

    statusWriter.setLoading(waterfall.isFetching);

    return (
        <StatusWrapper
            className="h-full"
            isPending={waterfall.isFetching}
            errorMessage={waterfall.message ?? undefined}
        >
            <div ref={plotDivRef} className="h-full overflow-hidden">
                {waterfall.plots}
            </div>
        </StatusWrapper>
    );
}
