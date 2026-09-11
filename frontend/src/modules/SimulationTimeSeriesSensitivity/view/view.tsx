import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { HoverTopic, useHoverValue, usePublishHoverValue } from "@framework/HoverService";
import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useColorSet } from "@framework/WorkbenchSettings";
import { useElementSize } from "@lib/hooks/useElementSize";
import { simulationVectorDescription } from "@modules/_shared/reservoirSimulationStringUtils";

import type { Interfaces } from "../interfaces";

import { vectorSpecificationAtom } from "./atoms/baseAtoms";
import { activeTimestampUtcMsAtom } from "./atoms/persistableFixableAtoms";
import type { TimeSeriesChartHoverInfo } from "./components/timeSeriesChart";
import { TimeSeriesChart } from "./components/timeSeriesChart";
import { useMakeViewStatusWriterMessages } from "./hooks/useMakeViewStatusWriterMessages";
import { usePublishToDataChannels } from "./hooks/usePublishToDataChannels";
import { useTimeSeriesChartTracesDataArrayBuilder } from "./hooks/useTimeSeriesChartTracesDataArrayBuilder";

export const View = ({ viewContext, workbenchSettings, hoverService }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const statusWriter = useViewStatusWriter(viewContext);

    const [activeTimestampUtcMs, setSelectedTimestampUtcMs] = useAtom(activeTimestampUtcMsAtom);
    const vectorSpecification = useAtomValue(vectorSpecificationAtom);

    const descriptiveVectorName = vectorSpecification
        ? simulationVectorDescription(vectorSpecification?.vectorName)
        : "";
    const moduleInstanceId = viewContext.getInstanceIdString();
    const subscribedHoverTimestampUtcMs = useHoverValue(HoverTopic.TIMESTAMP, hoverService, moduleInstanceId);
    const setHoveredTimestamp = usePublishHoverValue(HoverTopic.TIMESTAMP, hoverService, moduleInstanceId);
    const setHoveredRealization = usePublishHoverValue(HoverTopic.REALIZATION, hoverService, moduleInstanceId);

    useMakeViewStatusWriterMessages(statusWriter);
    usePublishToDataChannels(viewContext);

    const colorSet = useColorSet(workbenchSettings);
    const traceDataArr = useTimeSeriesChartTracesDataArrayBuilder(colorSet);

    function handleHoverInChart(hoverInfo: TimeSeriesChartHoverInfo | null) {
        if (hoverInfo) {
            if (hoverInfo.shiftKeyIsDown) {
                setSelectedTimestampUtcMs(hoverInfo.timestampUtcMs);
            }

            setHoveredTimestamp(hoverInfo.timestampUtcMs);

            if (typeof hoverInfo.realization === "number") {
                setHoveredRealization(hoverInfo.realization);
            }
        } else {
            setHoveredTimestamp(null);
            setHoveredRealization(null);
        }
    }

    function handleClickInChart(timestampUtcMs: number) {
        setSelectedTimestampUtcMs(timestampUtcMs);
    }

    // "overflow-hidden" in order to avoid flickering when zooming in browser (chrome)
    return (
        <div className="w-full h-full overflow-hidden" ref={wrapperDivRef}>
            <TimeSeriesChart
                traceDataArr={traceDataArr}
                title={descriptiveVectorName}
                uirevision={vectorSpecification?.vectorName}
                activeTimestampUtcMs={activeTimestampUtcMs.value ?? undefined}
                hoveredTimestampUtcMs={subscribedHoverTimestampUtcMs ?? undefined}
                onClick={handleClickInChart}
                onHover={handleHoverInChart}
                height={wrapperDivSize.height}
                width={wrapperDivSize.width}
            />
        </div>
    );
};
