import React from "react";

import { CuttingPlane_api } from "@api";
import { Controller, IntersectionReferenceSystem, PixiRenderApplication } from "@equinor/esv-intersection";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { makeExtendedTrajectory, useGridParameterImageQuery, useSeismicImageQuery } from "./IntersectionController";
import { ControllerHandler, addMDOverlay } from "./IntersectionController";
import {
    useGetWellTrajectories,
    useGetWellborePicksForWellbore,
    useGridParameterIntersectionQuery,
    useSeismicIntersectionQuery,
    useSurfaceIntersectionsQuery,
} from "./queryHooks";
import { state } from "./state";

export type IntersectionViewSettings = {
    showGridParameter: boolean;
    showSeismic: boolean;
    showSurfaces: boolean;
    showWellMarkers: boolean;
    extension: number;
    zScale: number;
};

export function view({ moduleContext, workbenchSession, workbenchSettings, workbenchServices }: ModuleFCProps<state>) {
    const [wellBoreAddress] = moduleContext.useStoreState("wellBoreAddress");
    const [seismicAddress] = moduleContext.useStoreState("seismicAddress");
    const [gridParameterAddress] = moduleContext.useStoreState("gridParameterAddress");
    const [surfaceAddress] = moduleContext.useStoreState("surfaceAddress");

    const [viewSettings] = moduleContext.useStoreState("viewSettings");

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const controllerRef = React.useRef<Controller | null>(null);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);

    const [pixiContext, setPixiContext] = React.useState<PixiRenderApplication | null>(null);
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    const seismicColorScale = workbenchSettings.useDiscreteColorScale({
        gradientType: ColorScaleGradientType.Diverging,
    });
    const seismicColors = seismicColorScale.getColorPalette().getColors();
    const gridParameterColorScale = workbenchSettings.useDiscreteColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });
    const gridParameterColors = gridParameterColorScale.getColorPalette().getColors();
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    React.useEffect(function initializeController() {
        if (containerRef.current) {
            const axisOptions = { xLabel: "x", yLabel: "y", unitOfMeasure: "m" };
            controllerRef.current = new Controller({ container: containerRef.current, axisOptions });
            addMDOverlay(controllerRef.current);
            const controllerHandler = new ControllerHandler(controllerRef.current);
            controllerHandler.init(viewSettings.zScale);

            const width = wrapperDivSize.width;
            const height = wrapperDivSize.height - 100;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const pixiContext = new PixiRenderApplication({ width, height });
            setPixiContext(pixiContext);
        }
        return () => {
            console.debug("controller destroyed");
            controllerRef.current?.destroy();
        };
    }, []);

    let computedSelectedWellBore = wellBoreAddress;
    const syncedWellBore = syncHelper.useValue(SyncSettingKey.WELLBORE, "global.syncValue.wellBore");
    if (syncedWellBore) {
        computedSelectedWellBore = syncedWellBore;
    }
    const getWellborePicksForWellboreQuery = useGetWellborePicksForWellbore(
        computedEnsembleIdent?.getCaseUuid(),
        computedSelectedWellBore ? computedSelectedWellBore.uuid : undefined
    );

    const getWellTrajectoriesQuery = useGetWellTrajectories(
        computedSelectedWellBore ? [computedSelectedWellBore.uuid] : undefined
    );

    const extendedTrajectory = makeExtendedTrajectory(getWellTrajectoriesQuery, viewSettings.extension);

    const curtain: number[][] | null = extendedTrajectory
        ? IntersectionReferenceSystem.toDisplacement(extendedTrajectory.points, extendedTrajectory.offset)
        : null;

    const xArr = extendedTrajectory ? extendedTrajectory.points.map((coord) => coord[0]) : undefined;
    const yArr = extendedTrajectory ? extendedTrajectory.points.map((coord) => coord[1]) : undefined;

    const cuttingPlane: CuttingPlane_api = {
        x_arr: xArr ?? [],
        y_arr: yArr ?? [],
        h_arr: curtain ? curtain.map((c: number[]) => c[0] - viewSettings.extension) : [],
    };
    const timeString = seismicAddress?.timeString?.replaceAll("Z", "").replaceAll(".000", "");

    const seismicFenceQuery = useSeismicIntersectionQuery(
        seismicAddress?.caseUuid,
        seismicAddress?.ensemble,
        seismicAddress?.realizationNum,
        seismicAddress?.attribute,
        timeString,
        seismicAddress?.observed ?? undefined,
        cuttingPlane,
        viewSettings.showSeismic
    );
    const gridParameterIntersectionQuery = useGridParameterIntersectionQuery(
        gridParameterAddress?.caseUuid,
        gridParameterAddress?.ensemble,
        gridParameterAddress?.gridName,
        gridParameterAddress?.parameterName,
        gridParameterAddress?.realizationNum,
        cuttingPlane,
        viewSettings.showGridParameter
    );
    const surfaceIntersectionsQuery = useSurfaceIntersectionsQuery(
        surfaceAddress,
        cuttingPlane,
        surfaceAddress && cuttingPlane && viewSettings.showSurfaces ? true : false
    );

    const seismicDataValues: number[][] | null = seismicFenceQuery.data
        ? JSON.parse(seismicFenceQuery.data.xy_arr_string)
        : null;
    const seismicYValues: number[] | null = seismicFenceQuery.data
        ? JSON.parse(seismicFenceQuery.data.z_arr_string)
        : null;

    const seismicImageQuery = useSeismicImageQuery(seismicDataValues, seismicYValues, curtain, seismicColors);

    const gridParameterDataValues: number[][] | null = gridParameterIntersectionQuery.data
        ? JSON.parse(gridParameterIntersectionQuery.data.xy_arr_string)
        : null;
    const gridParameterYValues: number[] | null = gridParameterIntersectionQuery.data
        ? JSON.parse(gridParameterIntersectionQuery.data.z_arr_string)
        : null;

    let gridColorMin: number | null = null;
    let gridColorMax: number | null = null;
    if (gridParameterAddress?.lockColorRange) {
        gridColorMin = gridParameterAddress.colorMin ?? null;
        gridColorMax = gridParameterAddress.colorMax ?? null;
    }
    const gridParameterImageQuery = useGridParameterImageQuery(
        gridParameterDataValues,
        gridParameterYValues,
        curtain,
        gridParameterColors,
        gridColorMin,
        gridColorMax
    );

    if (controllerRef.current && getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length > 0) {
        const controllerHandler = new ControllerHandler(controllerRef.current);
        controllerHandler.clear();

        const wellTrajectory = getWellTrajectoriesQuery.data[0];
        controllerHandler.addWellborePathLayer(wellTrajectory);

        if (
            gridParameterDataValues &&
            gridParameterYValues &&
            gridParameterImageQuery.data &&
            viewSettings.showGridParameter &&
            curtain
        ) {
            controllerHandler.addGridParameterLayer(
                curtain,
                viewSettings.extension,
                gridParameterImageQuery.data,
                gridParameterDataValues,
                gridParameterYValues
            );
        }
        if (seismicDataValues && seismicYValues && seismicImageQuery.data && viewSettings.showSeismic && curtain) {
            controllerHandler.addSeismicLayer(
                curtain,
                viewSettings.extension,
                seismicImageQuery.data,
                seismicDataValues,
                seismicYValues
            );
        }

        if (getWellborePicksForWellboreQuery.data && viewSettings.showWellMarkers) {
            controllerHandler.addWellborePicksLayer(getWellborePicksForWellboreQuery.data);
        }
        if (surfaceIntersectionsQuery.data && viewSettings.showSurfaces && pixiContext) {
            controllerHandler.addSurfaceLayers(surfaceIntersectionsQuery.data, pixiContext);
        }
        controllerHandler.update(
            wrapperDivSize.width,
            wrapperDivSize.height - 100,
            viewSettings.zScale,
            curtain,
            viewSettings.extension
        );
    }

    const isLoading =
        gridParameterIntersectionQuery.isFetching ||
        seismicFenceQuery.isFetching ||
        getWellTrajectoriesQuery.isFetching ||
        getWellborePicksForWellboreQuery.isFetching ||
        surfaceIntersectionsQuery.isFetching;
    const isError =
        gridParameterIntersectionQuery.isError ||
        seismicFenceQuery.isError ||
        getWellTrajectoriesQuery.isError ||
        getWellborePicksForWellboreQuery.isError ||
        surfaceIntersectionsQuery.isError;
    return (
        <>
            <div ref={wrapperDivRef} className="relative w-full h-full">
                <div>
                    {isLoading && (
                        <div className="absolute left-5 right-0 m-2 bg-white bg-opacity-80 flex items-left text-3xl justify-left z-10">
                            <CircularProgress />
                            {"Loading new data"}
                        </div>
                    )}
                    {isError && (
                        <div className="absolute left-0 right-0  bg-white bg-opacity-80 flex items-center justify-center z-10">
                            {"Error loading data"}
                        </div>
                    )}
                </div>
                <label className="block text-xl font-medium text-gray-700  text-center dark:text-gray-200 mt-4 mb-2">
                    {computedSelectedWellBore?.uwi}
                </label>
                <div ref={containerRef}></div>
            </div>
        </>
    );
}
