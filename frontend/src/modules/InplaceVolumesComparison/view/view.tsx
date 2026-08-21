import React from "react";

import { useAtomValue } from "jotai";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { StatusWrapper } from "@lib/components/StatusWrapper";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import type { Interfaces } from "../interfaces";

import { showTableAtom } from "./atoms/baseAtoms";
import { WaterfallTable } from "./components/WaterfallTable";
import { useBuildWaterfallPlot } from "./hooks/useBuildWaterfallPlot";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useViewStatusWriter(props.viewContext);
    const showTable = useAtomValue(showTableAtom);

    const plotDivRef = React.useRef<HTMLDivElement>(null);
    const plotDivBoundingRect = useElementBoundingRect(plotDivRef);

    const waterfall = useBuildWaterfallPlot(ensembleSet, plotDivBoundingRect.width, plotDivBoundingRect.height);

    statusWriter.setLoading(waterfall.isFetching);
    for (const warning of waterfall.warnings) {
        statusWriter.addWarning(warning);
    }

    const infoMessage = waterfall.message?.severity === "info" ? waterfall.message.text : null;
    const errorMessage = waterfall.message?.severity === "error" ? waterfall.message.text : undefined;

    return (
        <StatusWrapper className="h-full" isPending={waterfall.isFetching} errorMessage={errorMessage}>
            <div className="flex h-full min-h-0 flex-col">
                <div ref={plotDivRef} className="min-h-0 flex-1 overflow-hidden">
                    {infoMessage ? <ContentInfo>{infoMessage}</ContentInfo> : waterfall.plots}
                </div>
                {showTable && waterfall.endpointLabels && waterfall.groups.length > 0 && (
                    <div className="px-sm py-xs max-h-1/3 min-h-0 flex-none overflow-auto">
                        <WaterfallTable
                            groups={waterfall.groups}
                            referenceLabel={waterfall.endpointLabels.referenceLabel}
                            comparisonLabel={waterfall.endpointLabels.comparisonLabel}
                        />
                    </div>
                )}
            </div>
        </StatusWrapper>
    );
}
