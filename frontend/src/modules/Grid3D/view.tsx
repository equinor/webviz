import React, { useState } from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";
import { SubsurfaceViewer } from "@webviz/subsurface-components";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useGridGeometry, useGridParameter, useStatisticalGridParameter, useRealizations } from "./queryHooks";
import state from "./state";
import { useParameterQuery } from "@modules/TimeSeriesParameterDistribution/queryHooks";
import { toArrayBuffer } from "./vtkUtils";
import { type } from "os";


export type B64EncodedNumpyArray = {
    bvals: string;
    dtype: string;
    shape: Array<number>;
};


const b64toArray = (encodedArray: B64EncodedNumpyArray): number[] => {
    const bvals = encodedArray.bvals
    const dtype = encodedArray.dtype
    const shape = encodedArray.shape
    const arrayBuffer = toArrayBuffer(bvals)
    console.log(shape)
    const array = new Float32Array(arrayBuffer)
    return Array.from(array)
}
//-----------------------------------------------------------------------------------------------------------
export function view({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const selectedEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const gridName = moduleContext.useStoreValue("gridName");
    const parameterName = moduleContext.useStoreValue("parameterName");
    const realizations = moduleContext.useStoreValue("realizations");
    const useStatistics = moduleContext.useStoreValue("useStatistics");
    const selectedEnsemble = selectedEnsembles && selectedEnsembles.length > 0 ? selectedEnsembles[0] : { caseUuid: null, ensembleName: null };

    const gridGeometryQuery = useGridGeometry(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName, realizations ? realizations[0] : "0");
    const gridParameterQuery = useGridParameter(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName, parameterName, realizations ? realizations[0] : "0", useStatistics);
    const statisticalGridParameterQuery = useStatisticalGridParameter(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, gridName, parameterName, realizations, useStatistics);

    const bounds = gridGeometryQuery?.data ? [gridGeometryQuery.data.xmin, gridGeometryQuery.data.ymin, -gridGeometryQuery.data.zmax, gridGeometryQuery.data.xmax, gridGeometryQuery.data.ymax, -gridGeometryQuery.data.zmin] : [0, 0, 0, 100, 100, 100];

    if (!gridGeometryQuery.data) { return (<div>no grid geometry</div>) }
    const pointsArray = gridGeometryQuery?.data ? toArrayBuffer(gridGeometryQuery.data.points as any) : []
    const polysArray = gridGeometryQuery?.data ? toArrayBuffer(gridGeometryQuery.data.polys as any) : []


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
                        colorMapName: "Physics",
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
