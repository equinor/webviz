import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";

import { SigSurfaceState } from "./sigSurfaceState";
import { useStaticSurfaceDataQuery, useDynamicSurfaceDataQuery } from "./sigSurfaceQueryHooks";


//-----------------------------------------------------------------------------------------------------------
export function SigSurfaceView({ moduleContext, workbenchServices }: ModuleFCProps<SigSurfaceState>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const caseUuid = useSubscribedValue("navigator.caseId", workbenchServices);
    const ensembleName = moduleContext.useStoreValue("ensembleName");
    const surfaceName = moduleContext.useStoreValue("surfaceName");
    const surfaceAttribute = moduleContext.useStoreValue("surfaceAttribute");
    const realizationNum = moduleContext.useStoreValue("realizationNum");
    const timeOrInterval = moduleContext.useStoreValue("timeOrInterval");

    //const surfDataQuery = useStaticSurfaceDataQuery(caseUuid, ensembleName, realizationNum, surfaceName, surfaceAttribute, true);
    const surfDataQuery = useDynamicSurfaceDataQuery(caseUuid, ensembleName, realizationNum, surfaceName, surfaceAttribute, timeOrInterval, true);

    let surfMetaJson = "";
    if (surfDataQuery.data) {
        const { base64_encoded_image, ...the_meta_stuff} = surfDataQuery.data;
        surfMetaJson = JSON.stringify(the_meta_stuff,);
    }

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
            </div>
            <br />
            min x,y: {surfDataQuery.data?.x_min.toFixed(2)}, {surfDataQuery.data?.y_min.toFixed(2)}
            <br />
            min/max val: {surfDataQuery.data?.val_min.toFixed(2)}, {surfDataQuery.data?.val_max.toFixed(2)}
            <br />
            rot: {surfDataQuery.data?.rot_deg.toFixed(2)}
            
            <div className="flex-grow h-0" ref={wrapperDivRef}>
                <img alt={surfDataQuery.status} src={`data:image/png;base64,${surfDataQuery.data?.base64_encoded_image}`} style={{objectFit:"contain", width:wrapperDivSize.width, height:wrapperDivSize.height }} ></img>
            </div>
        </div>
    );
}
