import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { useSurfaceDataQueryByAddress } from "./MapQueryHooks";
import { MapState } from "./MapState";
import { makeSurfAddrString } from "./SurfAddr";
import {SubsurfaceViewer} from "@webviz/subsurface-components"
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
    if (surfDataQuery.data) {
        return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer 
                id="deckgl" 
                layers={[   {
                    "@@type": "MapLayer",
                    "id": "mesh-layer",
                    "meshData": JSON.parse(surfDataQuery.data?.mesh_data),
                    "frame": {
                      "origin": [
                        surfDataQuery.data?.x_ori,
                        surfDataQuery.data?.y_ori
                      ],
                      "count": [
                        surfDataQuery.data?.x_count,
                        surfDataQuery.data?.y_count
                      ],
                      "increment": [
                        surfDataQuery.data?.x_inc,
                        surfDataQuery.data?.y_inc
                      ],
                      "rotDeg": surfDataQuery.data?.rot_deg,
                      
                    },
                    
                    "contours": [
                      0,
                      100
                    ],
                    "isContoursDepth": true,
                    "gridLines": false,
                    "material": true,
                    "smoothShading": true,
                    "colorMapName": "Physics"
                  }, 
                ]}
            />
           

        </div>
    );
            }
    return (<div/>)
}
