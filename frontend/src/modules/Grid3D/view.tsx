import { WellBoreTrajectory_api } from "@api";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { ModuleFCProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import {
    createContinuousColorScaleForMap,
    createNorthArrowLayer,
    createWellBoreHeaderLayer,
    createWellboreTrajectoryLayer,
} from "@modules/SubsurfaceMap/_utils";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import SubsurfaceViewer from "@webviz/subsurface-viewer";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";

import { useGridParameter, useGridSurface } from "./queryHooks";
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
    // const gridParameterQuery = useGridParameter(
    //     firstCaseUuid,
    //     firstEnsembleName,
    //     gridName,
    //     parameterName,
    //     realizations ? realizations[0] : "0",
    //     useStatistics
    // );

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* <SubsurfaceViewer
                id={viewIds.view}
                bounds={[bounds[0], bounds[1], bounds[3], bounds[4]]}
                colorTables={colorTables}
                layers={newLayers}
                toolbar={{ visible: true }}
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
                {" "}
                <ViewAnnotation id={viewIds.annotation}>
                    <ContinuousLegend
                        colorTables={colorTables}
                        colorName="Continuous"
                        min={propertyRange ? propertyRange[0] : undefined}
                        max={propertyRange ? propertyRange[1] : undefined}
                        cssLegendStyles={{ bottom: "0", right: "0" }}
                    />
                </ViewAnnotation>
            </SubsurfaceViewer> */}
        </div>
    );
}
