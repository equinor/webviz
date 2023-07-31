import React from "react";

import { ModuleFCProps } from "@framework/Module";
import SubsurfaceViewer from "@webviz/subsurface-viewer";

import { useSurfaceDataQueryByAddress } from "./MapQueryHooks";
import { MapState } from "./MapState";
import { makeSurfAddrString } from "./SurfAddr";

//-----------------------------------------------------------------------------------------------------------
export function MapView(props: ModuleFCProps<MapState>) {
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
    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer
                id="deckgl"
                layers={[
                    {
                        "@@type": "MapLayer",
                        id: "mesh-layer",
                        meshData: JSON.parse(surfData.mesh_data),
                        frame: {
                            origin: [surfData.x_ori, surfData.y_ori],
                            count: [surfData.x_count, surfData.y_count],
                            increment: [surfData.x_inc, surfData.y_inc],
                            rotDeg: surfData.rot_deg,
                        },

                        contours: [0, 100],
                        isContoursDepth: true,
                        gridLines: false,
                        material: true,
                        smoothShading: true,
                        colorMapName: "Physics",
                    },
                ]}
            />
            <div className="absolute bottom-5 right-5 italic text-pink-400">{props.moduleContext.getInstanceIdString()}</div>
        </div>
    );
}
