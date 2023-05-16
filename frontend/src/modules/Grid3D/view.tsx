import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { SubsurfaceViewer } from "@webviz/subsurface-components";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useGridSurface, useGridParameter, useStatisticalGridParameter } from "./queryHooks";
import state from "./state";
import { toArrayBuffer } from "@shared-utils/vtkUtils";





//-----------------------------------------------------------------------------------------------------------
export function view({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    // From Workbench
    const selectedEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const selectedEnsemble = selectedEnsembles?.[0] ?? { caseUuid: null, ensembleName: null };

    // State
    const gridName = moduleContext.useStoreValue("gridName");
    const parameterName = moduleContext.useStoreValue("parameterName");
    const realizations = moduleContext.useStoreValue("realizations");
    const useStatistics = moduleContext.useStoreValue("useStatistics");

    //Queries
    const gridSurfaceQuery = useGridSurface(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName, realizations ? realizations[0] : "0");
    const gridParameterQuery = useGridParameter(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName, parameterName, realizations ? realizations[0] : "0", useStatistics);
    const statisticalGridParameterQuery = useStatisticalGridParameter(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName, parameterName, realizations, useStatistics);


    const bounds = gridSurfaceQuery?.data ? [gridSurfaceQuery.data.xmin, gridSurfaceQuery.data.ymin, -gridSurfaceQuery.data.zmax, gridSurfaceQuery.data.xmax, gridSurfaceQuery.data.ymax, -gridSurfaceQuery.data.zmin] : [0, 0, 0, 100, 100, 100];

    if (!gridSurfaceQuery.data) { return (<div>no grid geometry</div>) }
    const pointsArray = gridSurfaceQuery?.data ? toArrayBuffer(gridSurfaceQuery.data.points as any) : []
    const polysArray = gridSurfaceQuery?.data ? toArrayBuffer(gridSurfaceQuery.data.polys as any) : []


    let propertiesArray: number[] = []
    if (!useStatistics && gridParameterQuery?.data) {
        propertiesArray = Array.from(gridParameterQuery.data)
    }
    else if (useStatistics && statisticalGridParameterQuery?.data) {
        propertiesArray = Array.from(statisticalGridParameterQuery.data)
    }
    const points: Float32Array = new Float32Array(pointsArray as number[])
    const polys: Uint32Array = new Uint32Array(polysArray as number[])

    return (
        <div className="relative w-full h-full flex flex-col">

            <SubsurfaceViewer
                id="deckgl"
                bounds={[bounds[0], bounds[1], bounds[3], bounds[4]]}
                colorTables={[
                    {
                        "name": "viridis (Seq)",
                        "colors": [
                            [0.0, 68, 1, 84],
                            [0.05263157894736842, 71, 20, 102],
                            [0.10526315789473684, 71, 37, 117],
                            [0.15789473684210525, 69, 54, 129],
                            [0.21052631578947367, 63, 69, 135],
                            [0.2631578947368421, 57, 85, 139],
                            [0.3157894736842105, 50, 98, 141],
                            [0.3684210526315789, 44, 112, 142],
                            [0.42105263157894735, 39, 124, 142],
                            [0.47368421052631576, 34, 137, 141],
                            [0.5263157894736842, 31, 150, 139],
                            [0.5789473684210527, 31, 163, 134],
                            [0.631578947368421, 41, 175, 127],
                            [0.6842105263157894, 61, 187, 116],
                            [0.7368421052631579, 85, 198, 102],
                            [0.7894736842105263, 116, 208, 84],
                            [0.8421052631578947, 149, 215, 63],
                            [0.894736842105263, 186, 222, 39],
                            [0.9473684210526315, 220, 226, 24],
                            [1.0, 253, 231, 36],
                        ],
                        "discrete": false,
                    }]}
                layers={[
                    {
                        "@@type": "AxesLayer",
                        "id": "axes-layer",
                        "bounds": bounds
                    },
                    {
                        "@@type": "Grid3DLayer",
                        id: "grid3d-layer",
                        material: false,
                        pointsData: Array.from(points),
                        polysData: Array.from(polys),
                        propertiesData: propertiesArray,
                        colorMapName: "viridis (Seq)",
                    },
                ]}
                views={{
                    "layout": [1, 1],
                    "viewports": [{ "id": "view_1", "show3D": true }],
                }}
            />
            <div className="absolute bottom-5 right-5 italic text-pink-400">{moduleContext.getInstanceIdString()}</div>
        </div>
    );
}
