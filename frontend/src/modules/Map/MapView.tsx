import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { useSurfaceDataQueryByAddress } from "./MapQueryHooks";
import { MapState } from "./MapState";
import { makeSurfAddrString } from "./SurfAddr";

//-----------------------------------------------------------------------------------------------------------
export function MapView({ moduleContext }: ModuleFCProps<MapState>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const surfAddr = moduleContext.useStoreValue("surfaceAddress");

    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    console.log(`render MapView, surfAddr=${surfAddr ? makeSurfAddrString(surfAddr) : "null"}`);

    const surfDataQuery = useSurfaceDataQueryByAddress(surfAddr);
    const surfAddrAsAny = surfAddr as any;

    return (
        <div className="w-full h-full flex flex-col">
            <div>
                addressType: {surfAddr?.addressType ?? "---"}
                <br />
                caseUuid: {surfAddr?.caseUuid ?? "---"}
                <br />
                ensembleName: {surfAddr?.ensemble ?? "---"}
                <br />
                surfaceName: {surfAddr?.name ?? "---"}
                <br />
                surfaceAttribute: {surfAddr?.attribute ?? "---"}
                <br />
                timeOrInterval: {surfAddrAsAny?.timeOrInterval ?? "---"}
                <br />
                realizationNum: {surfAddrAsAny?.realizationNum ?? "---"}
                <br />
                statisticFunction: {surfAddrAsAny?.statisticFunction ?? "Single realization"}
            </div>
            <br />
            min x,y: {surfDataQuery.data?.x_min.toFixed(2)}, {surfDataQuery.data?.y_min.toFixed(2)}
            <br />
            min/max val: {surfDataQuery.data?.val_min.toFixed(2)}, {surfDataQuery.data?.val_max.toFixed(2)}
            <br />
            rot: {surfDataQuery.data?.rot_deg.toFixed(2)}
            <br />
            renderCount: {renderCount.current}
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
