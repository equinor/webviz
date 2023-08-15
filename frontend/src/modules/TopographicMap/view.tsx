import React from "react";

import { ModuleFCProps } from "@framework/Module";
import SubsurfaceViewer from "@webviz/subsurface-viewer";

import { useSurfaceDataQueryByAddress } from "././queryHooks";
import { makeSurfAddrString } from "./SurfAddr";
import { SubsurfaceMapSingleView } from "./components/SubsurfaceMapSingleView";
import { state } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function view(props: ModuleFCProps<state>) {
    const surfAddr = props.moduleContext.useStoreValue("surfaceAddress");
    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    console.debug(`render MapView, surfAddr=${surfAddr ? makeSurfAddrString(surfAddr) : "null"}`);

    const surfDataQuery = useSurfaceDataQueryByAddress(surfAddr);
    if (!surfDataQuery.data) {
        return <div>No data</div>;
    }

    const surfData = surfDataQuery.data;
    let meshValues = JSON.parse(surfData.mesh_data);

    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceMapSingleView surfData={surfData} />
        </div>
    );
}
