import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import type { Interfaces } from "../interfaces";

import { useBuildWaterfallPlot } from "./hooks/useBuildWaterfallPlot";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);

    const plotDivRef = React.useRef<HTMLDivElement>(null);
    const plotDivBoundingRect = useElementBoundingRect(plotDivRef);

    const waterfall = useBuildWaterfallPlot(ensembleSet, plotDivBoundingRect.width, plotDivBoundingRect.height);

    statusWriter.setLoading(waterfall.isFetching);
    if (waterfall.warning) {
        statusWriter.addWarning(waterfall.warning);
    }

    const infoMessage = waterfall.message?.severity === "info" ? waterfall.message.text : null;
    const errorMessage = waterfall.message?.severity === "error" ? waterfall.message.text : undefined;

    return (
        <StatusWrapper className="h-full" isPending={waterfall.isFetching} errorMessage={errorMessage}>
            <div ref={plotDivRef} className="h-full overflow-hidden">
                {infoMessage ? <ContentInfo>{infoMessage}</ContentInfo> : waterfall.plots}
            </div>
        </StatusWrapper>
    );
}
