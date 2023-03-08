import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";

import { useSomeSurfaceDataQuery } from "./sigSurfaceQueryHooks";
import { SigSurfaceState } from "./sigSurfaceState";

//-----------------------------------------------------------------------------------------------------------
export function SigSurfaceView({ moduleContext, workbenchServices }: ModuleFCProps<SigSurfaceState>) {
    console.log("render SigSurfaceView");

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const surfaceType = moduleContext.useStoreValue("surfaceType");
    const ensembleName = moduleContext.useStoreValue("ensembleName");
    const surfaceName = moduleContext.useStoreValue("surfaceName");
    const surfaceAttribute = moduleContext.useStoreValue("surfaceAttribute");
    const realizationNum = moduleContext.useStoreValue("realizationNum");
    const timeOrInterval = moduleContext.useStoreValue("timeOrInterval");
    const aggregation = moduleContext.useStoreValue("aggregation");

    const surfDataQuery = useSomeSurfaceDataQuery(
        surfaceType,
        aggregation,
        caseUuid,
        ensembleName,
        realizationNum,
        surfaceName,
        surfaceAttribute,
        timeOrInterval
    );

    return (
        <div className="w-full h-full flex flex-col">
            <div>
                ensembleName: {ensembleName ?? "---"}
                <br />
                surfaceName: {surfaceName ?? "---"}
                <br />
                surfaceAttribute: {surfaceAttribute ?? "---"}
                <br />
                timeOrInterval: {timeOrInterval ?? "---"}
                <br />
                realizationNum: {realizationNum ?? "---"}
                <br />
                aggregation: {aggregation ?? "Single realization"}
            </div>
            <br />
            min x,y: {surfDataQuery.data?.x_min.toFixed(2)}, {surfDataQuery.data?.y_min.toFixed(2)}
            <br />
            min/max val: {surfDataQuery.data?.val_min.toFixed(2)}, {surfDataQuery.data?.val_max.toFixed(2)}
            <br />
            rot: {surfDataQuery.data?.rot_deg.toFixed(2)}
            <div className="flex-grow h-0" ref={wrapperDivRef}>
                <img
                    alt={surfDataQuery.status}
                    src={surfDataQuery.data ? `data:image/png;base64,${surfDataQuery.data.base64_encoded_image}` : ""}
                    style={{ objectFit: "contain", width: wrapperDivSize.width, height: wrapperDivSize.height }}
                ></img>
            </div>
        </div>
    );
}
