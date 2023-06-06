import React, { useEffect } from "react";
import { SurfaceMeshAndProperty } from "@api"
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { SubsurfaceViewer } from "@webviz/subsurface-components";

import { useSeismicAttributeNearSurfaceQuery } from "./queryHooks";
import { state } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function view(props: ModuleFCProps<state>) {
    // From Workbench
    const workbenchEnsembles = useSubscribedValue("navigator.ensembles", props.workbenchServices);

    //Just using the first ensemble for now
    const selectedEnsemble = workbenchEnsembles?.[0] ?? { caseUuid: undefined, ensembleName: undefined };
    
        
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const selectedSurface = props.moduleContext.useStoreValue("selectedSurface");
    const selectedSeismicCube = props.moduleContext.useStoreValue("selectedSeismicCube");
    const [surfaceData,setSurfaceData] = React.useState<SurfaceMeshAndProperty | null>(null)
    const [initialBounds, setInitialBounds] = React.useState<number[] | null>(null);

    const is3D = props.moduleContext.useStoreValue("show3D");
    const attributeQuery = useSeismicAttributeNearSurfaceQuery(
        selectedEnsemble?.caseUuid, 
        selectedEnsemble?.ensembleName, 
        1,
        selectedSeismicCube?.name, 
        selectedSeismicCube?.timestampOrTimestep,
        selectedSurface?.name,
        selectedSurface?.attribute);

    useEffect(() => {
        if (attributeQuery.data) {
            setSurfaceData(attributeQuery.data)
            if (!initialBounds) {
                setInitialBounds([
                    attributeQuery.data.x_min,
                    attributeQuery.data.y_min,
                    -attributeQuery.data.mesh_value_max,
                    attributeQuery.data.x_max,
                    attributeQuery.data.y_max,
                    -attributeQuery.data.mesh_value_min
                ])
            }
        }
    }, [attributeQuery.data])

    if (!surfaceData) {
        return <div ref={wrapperDivRef} className="w-full h-full flex justify-center items-center">Loading...</div>;
    }
    return (
        <div className="relative w-full h-full flex flex-col">
            
            <SubsurfaceViewer
                id="deckgl"
                layers={[
                    {
                        "@@type": "AxesLayer",
                        "id": "axes-layer",
                        "bounds": initialBounds
                      },
                    AttributeLayer({surface:surfaceData, bounds:initialBounds, id:"attribute-layer"}),
                    MeshLayer({surface:surfaceData, bounds:initialBounds, id:"mesh-layer"}),
                ]}
                views={{
                    "layout": [
                      1,
                      2
                    ],
                    "showLabel": true,
                    "viewports": [
                      {
                        "id": "view_1",
                        "isSync": true,
                        "show3D": is3D,
                        "layerIds": [
                            "axes-layer",
                            "mesh-layer"
                        ]
                      },
                      {
                        "id": "view_2",
                        "isSync": true,
                        "show3D": is3D,
                        "layerIds": [
                            "axes-layer",
                            "attribute-layer"
                        ]
                      }
                    ]
                  }}
            />
            <div className="absolute bottom-5 right-5 italic text-pink-400">{props.moduleContext.getInstanceIdString()}</div>
        </div>
    );
}

type MapLayerProps = {
    surface: SurfaceMeshAndProperty
    bounds: number[]|null
    id: string
}

const AttributeLayer = ({surface, bounds, id}: MapLayerProps) => {
    const layerObject :any= {
        "@@type": "MapLayer",
        id: id,
        meshData: JSON.parse(surface.mesh_data),
        propertiesData: JSON.parse(surface.property_data),
        frame: {
            origin: [surface.x_ori, surface.y_ori],
            count: [surface.x_count, surface.y_count],
            increment: [surface.x_inc, surface.y_inc],
            rotDeg: surface.rot_deg,
        },
        colorMapRange : [surface.property_value_min, surface.property_value_max],
        meshValueRange : [surface.mesh_value_min, surface.mesh_value_max],
        propertyValueRange : [surface.property_value_min, surface.property_value_max],
        isContoursDepth: true,
        contours:[0,100],
        gridLines: false,
        material: {
            "ambient": 0.35,
            "diffuse": 0.6,
            "shininess": 100,
            "specularColor": [
              1,
              1,
              1
            ]
          },
        smoothShading: true,
        colorMapName: "Seismic",
    }
    // if (bounds) {
    //     layerObject.bounds = [bounds[0],bounds[1],bounds[3], bounds[4]]
    // }
    return layerObject}

    const MeshLayer = ({surface, bounds, id}: MapLayerProps) => {
        const layerObj:any =   {
            "@@type": "MapLayer",
            id: id,
            meshData: JSON.parse(surface.mesh_data),
            frame: {
                origin: [surface.x_ori, surface.y_ori],
                count: [surface.x_count, surface.y_count],
                increment: [surface.x_inc, surface.y_inc],
                rotDeg: surface.rot_deg,
            },
            // colorMapRange : [surface.mesh_value_min, surface.mesh_value_min],
            meshValueRange : [surface.mesh_value_min, surface.mesh_value_max],
            contours:[0,100],
            isContoursDepth: true,
            gridLines: false,
            material: {
                "ambient": 0.35,
                "diffuse": 0.6,
                "shininess": 100,
                "specularColor": [
                  1,
                  1,
                  1
                ]
              },
            smoothShading: true,
            colorMapName: "Physics",
        }
        // if (bounds) {
        //     layerObj.bounds = [bounds[0],bounds[1],bounds[3], bounds[4]]
        // }
        return layerObj}
        