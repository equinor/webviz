import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useSurfaceDataQueryByAddress } from "@modules_shared/Surface";
import SubsurfaceViewer from "@webviz/subsurface-viewer";

import { MapState } from "./MapState";
import { makeSurfaceAddressString } from "@modules_shared/Surface/surfaceAddress";

//-----------------------------------------------------------------------------------------------------------
export function MapView(props: ModuleFCProps<MapState>) {
    const surfaceAddress = props.moduleContext.useStoreValue("surfaceAddress");

    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    console.debug(`render MapView start [${surfaceAddress ? makeSurfaceAddressString(surfaceAddress) : "null"}]`);

    const surfDataQuery = useSurfaceDataQueryByAddress(surfaceAddress);
    console.debug(`surfDataQuery.status=${surfDataQuery.status}`);

    if (!surfDataQuery.data) {
        return <div>No data</div>;
    }

    console.debug(`render MapView done  [${surfaceAddress ? makeSurfaceAddressString(surfaceAddress) : "null"}]`);

    const surfData = surfDataQuery.data;
    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer
                id="deckgl"
                layers={[
                    {
                        "@@type": "MapLayer",
                        id: "mesh-layer",
                        // Drop conversion as soon as SubsurfaceViewer accepts typed arrays
                        meshData: Array.from(surfData.valuesFloat32Arr), 
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
            <div className="absolute bottom-5 right-5 italic text-pink-400">
                {props.moduleContext.getInstanceIdString()}
            </div>
        </div>
    );
}
