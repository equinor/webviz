import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import {
    ContentError,
    ContentMessage,
    ContentMessageType,
} from "@modules/_shared/components/ContentMessage/contentMessage";
import { Plot } from "@modules/_shared/components/Plot";

import type { Interfaces } from "../interfaces";

import { usePlotBuilder } from "./hooks/useVfpPlotBuilder";

export function View({ viewContext, workbenchSettings }: ModuleViewProps<Interfaces>) {
    const { tableDataStatus, tableNamesStatus } = viewContext.useSettingsToViewInterfaceValue(
        "tableDataAccessorWithStatusFlags",
    );

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const vfpPlotData = usePlotBuilder(viewContext, workbenchSettings, wrapperDivSize);

    let content = null;
    if (tableDataStatus.isError || tableNamesStatus.isError) {
        const source = tableDataStatus.isError ? "data" : "names";
        content = <ContentError>Error when loading VFP table {source}. See the log for details.</ContentError>;
    } else if (tableDataStatus.isFetching || tableNamesStatus.isFetching) {
        content = (
            <ContentMessage type={ContentMessageType.INFO}>
                <CircularProgress />
            </ContentMessage>
        );
    } else if (vfpPlotData === null) {
        content = <ContentMessage type={ContentMessageType.INFO}>Select valid data to display.</ContentMessage>;
    } else {
        content = <Plot layout={vfpPlotData.layout} data={vfpPlotData.data} />;
    }

    return (
        <div ref={wrapperDivRef} className="w-full h-full">
            {content}
        </div>
    );
}
