import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";

import { useAtomValue, useSetAtom } from "jotai";

import { userSelectedActiveTimestampUtcMsAtom, vectorSpecificationAtom } from "./atoms/baseAtoms";
import { activeTimestampUtcMsAtom } from "./atoms/derivedAtoms";
import { TimeSeriesChart, TimeSeriesChartHoverInfo } from "./components/timeSeriesChart";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { useTimeSeriesChartTracesDataArrayBuilder } from "./hooks/useTimeSeriesChartTracesDataArrayBuilder";

import { Interfaces } from "../interfaces";

export const View = ({ viewContext, workbenchSettings, workbenchServices }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const setUserSelectedTimestampUtcMs = useSetAtom(userSelectedActiveTimestampUtcMsAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);
    const vectorSpecification = useAtomValue(vectorSpecificationAtom);

    const subscribedHoverTimestampUtcMs = useSubscribedValue("global.hoverTimestamp", workbenchServices);

    usePublishToDataChannels(viewContext);

    const colorSet = workbenchSettings.useColorSet();
    const traceDataArr = useTimeSeriesChartTracesDataArrayBuilder(colorSet);

    function handleHoverInChart(hoverInfo: TimeSeriesChartHoverInfo | null) {
        if (hoverInfo) {
            if (hoverInfo.shiftKeyIsDown) {
                setUserSelectedTimestampUtcMs(hoverInfo.timestampUtcMs);
            }

            workbenchServices.publishGlobalData("global.hoverTimestamp", {
                timestampUtcMs: hoverInfo.timestampUtcMs,
            });

            if (typeof hoverInfo.realization === "number") {
                workbenchServices.publishGlobalData("global.hoverRealization", {
                    realization: hoverInfo.realization,
                });
            }
        } else {
            workbenchServices.publishGlobalData("global.hoverTimestamp", null);
            workbenchServices.publishGlobalData("global.hoverRealization", null);
        }
    }

    function handleClickInChart(timestampUtcMs: number) {
        setUserSelectedTimestampUtcMs(timestampUtcMs);
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <TimeSeriesChart
                traceDataArr={traceDataArr}
                title={vectorSpecification?.vectorName ?? ""}
                uirevision={vectorSpecification?.vectorName}
                activeTimestampUtcMs={activeTimestampUtcMs ?? undefined}
                hoveredTimestampUtcMs={subscribedHoverTimestampUtcMs?.timestampUtcMs ?? undefined}
                onClick={handleClickInChart}
                onHover={handleHoverInChart}
                height={wrapperDivSize.height}
                width={wrapperDivSize.width}
            />
        </div>
    );
};
