import { WellBoreTrajectory_api } from "@api";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { Grid3DLayer, NorthArrowLayer, WellsLayer } from "@modules/_shared/components/SubsurfaceViewer/layers";
import { createContinuousColorScaleForMap } from "@modules/_shared/components/SubsurfaceViewer/utils";
import SubsurfaceViewer from "@webviz/subsurface-viewer";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";

import { useGridParameter, useGridSurface, useStatisticalGridParameter } from "./queryHooks";
import state from "./state";

//-----------------------------------------------------------------------------------------------------------
export function View({ moduleContext, workbenchSettings, workbenchSession }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    const viewIds = {
        view: `${myInstanceIdStr}--view`,
        annotation: `${myInstanceIdStr}--annotation`,
    };
    // From Workbench
    const firstEnsemble = useFirstEnsembleInEnsembleSet(workbenchSession);

    // State
    const gridName = moduleContext.useStoreValue("gridName");
    const parameterName = moduleContext.useStoreValue("parameterName");
    const realizations = moduleContext.useStoreValue("realizations");
    const useStatistics = moduleContext.useStoreValue("useStatistics");
    const selectedWellUuids = moduleContext.useStoreValue("selectedWellUuids");
    const colorScale = workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });
    const colorTables = createContinuousColorScaleForMap(colorScale);

    //Queries
    const firstCaseUuid = firstEnsemble?.getCaseUuid() ?? null;
    const firstEnsembleName = firstEnsemble?.getEnsembleName() ?? null;
    const gridSurfaceQuery = useGridSurface(
        firstCaseUuid,
        firstEnsembleName,
        gridName,
        realizations ? realizations[0] : "0"
    );
    const gridParameterQuery = useGridParameter(
        firstCaseUuid,
        firstEnsembleName,
        gridName,
        parameterName,
        realizations ? realizations[0] : "0",
        useStatistics
    );
    const statisticalGridParameterQuery = useStatisticalGridParameter(
        firstCaseUuid,
        firstEnsembleName,
        gridName,
        parameterName,
        realizations,
        useStatistics
    );
    const wellTrajectoriesQuery = useFieldWellsTrajectoriesQuery(firstCaseUuid ?? undefined);
    const bounds = gridSurfaceQuery?.data
        ? [
              gridSurfaceQuery.data.xmin,
              gridSurfaceQuery.data.ymin,
              gridSurfaceQuery.data.zmin,
              gridSurfaceQuery.data.xmax,
              gridSurfaceQuery.data.ymax,
              gridSurfaceQuery.data.zmax,
          ]
        : [0, 0, 0, 100, 100, 100];

    const newLayers: Record<string, any>[] = [];
    const northArrowLayer = new NorthArrowLayer();
    newLayers.push(northArrowLayer.getLayer());

    let propertiesArray: number[] = [0, 1];
    if (gridSurfaceQuery.data) {
        const gridLayer = new Grid3DLayer();
        const points: Float32Array = gridSurfaceQuery.data.pointsFloat32Arr;
        const polys: Uint32Array = gridSurfaceQuery.data.polysUint32Arr;
        gridLayer.setData(points, polys);

        if (!useStatistics && gridParameterQuery?.data) {
            propertiesArray = Array.from(gridParameterQuery.data);
            gridLayer.setPropertyData(propertiesArray);
        } else if (useStatistics && statisticalGridParameterQuery?.data) {
            propertiesArray = Array.from(statisticalGridParameterQuery.data);
            gridLayer.setPropertyData(propertiesArray);
        }
        newLayers.push(gridLayer.getLayer());
    }

    if (wellTrajectoriesQuery.data) {
        const wellsLayer = new WellsLayer({ render2D: false });
        const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            selectedWellUuids.includes(well.wellbore_uuid)
        );
        wellsLayer.setData(wellTrajectories, null, null);

        newLayers.push(wellsLayer.getLayer());
    }
    const propertyRange = [
        propertiesArray.reduce((a, b) => Math.min(a, b)),
        propertiesArray.reduce((a, b) => Math.max(a, b)),
    ];
    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer
                id={viewIds.view}
                bounds={[bounds[0], bounds[1], bounds[3], bounds[4]]}
                colorTables={colorTables}
                layers={newLayers}
                views={{
                    layout: [1, 1],
                    showLabel: false,
                    viewports: [
                        {
                            id: "view_1",
                            isSync: true,
                            show3D: true,
                            layerIds: newLayers.map((layer) => layer.id) as string[],
                        },
                    ],
                }}
            >
                <ViewAnnotation id={viewIds.annotation}>
                    <ContinuousLegend
                        colorTables={colorTables}
                        colorName="Continuous"
                        min={propertyRange ? propertyRange[0] : undefined}
                        max={propertyRange ? propertyRange[1] : undefined}
                        cssLegendStyles={{ bottom: "0", right: "0" }}
                    />
                </ViewAnnotation>
            </SubsurfaceViewer>

            <div className="absolute bottom-5 right-5 italic text-pink-400">{moduleContext.getInstanceIdString()}</div>
        </div>
    );
}
