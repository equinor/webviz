import React from "react";

import { Layer } from "@deck.gl/core/typed";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Intersection, IntersectionType } from "@framework/types/intersection";
import { IntersectionPolyline, IntersectionPolylineWithoutId } from "@framework/userCreatedItems/IntersectionPolylines";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useFieldWellboreTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";
import { NorthArrow3DLayer } from "@webviz/subsurface-viewer/dist/layers";

import { useAtom, useSetAtom } from "jotai";

import { editCustomIntersectionPolylineEditModeActiveAtom, intersectionTypeAtom } from "./atoms/baseAtoms";
import { SyncedSettingsUpdateWrapper } from "./components/SyncedSettingsUpdateWrapper";
import { useGridParameterQuery, useGridSurfaceQuery } from "./queries/gridQueries";
import { useGridPolylineIntersection as useGridPolylineIntersectionQuery } from "./queries/polylineIntersection";
import { useWellboreCasingsQuery } from "./queries/wellboreSchematicsQueries";
import { makeAxesLayer, makeGrid3DLayer, makeIntersectionLayer, makeWellsLayer } from "./utils/layers";

import { Interfaces } from "../interfaces";
import { userSelectedCustomIntersectionPolylineIdAtom } from "../settings/atoms/baseAtoms";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const syncedSettingKeys = props.viewContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    let colorScale = props.viewContext.useSettingsToViewInterfaceValue("colorScale");
    const defaultColorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });
    if (!colorScale) {
        colorScale = defaultColorScale;
    }

    const useCustomBounds = props.viewContext.useSettingsToViewInterfaceValue("useCustomBounds");

    const intersectionPolylines = useIntersectionPolylines(props.workbenchSession);

    const ensembleIdent = props.viewContext.useSettingsToViewInterfaceValue("ensembleIdent");
    const highlightedWellboreUuid = props.viewContext.useSettingsToViewInterfaceValue("highlightedWellboreUuid");
    const realization = props.viewContext.useSettingsToViewInterfaceValue("realization");
    const wellboreUuids = props.viewContext.useSettingsToViewInterfaceValue("wellboreUuids");
    const gridModelName = props.viewContext.useSettingsToViewInterfaceValue("gridModelName");
    const gridModelBoundingBox3d = props.viewContext.useSettingsToViewInterfaceValue("gridModelBoundingBox3d");
    const gridModelParameterName = props.viewContext.useSettingsToViewInterfaceValue("gridModelParameterName");
    const gridModelParameterDateOrInterval = props.viewContext.useSettingsToViewInterfaceValue(
        "gridModelParameterDateOrInterval"
    );

    const editPolylineModeActive = props.viewContext.useSettingsToViewInterfaceValue(
        "editCustomIntersectionPolylineEditModeActive"
    );
    const setEditPolylineModeActive = useSetAtom(editCustomIntersectionPolylineEditModeActiveAtom);

    const intersectionType = props.viewContext.useSettingsToViewInterfaceValue("intersectionType");
    const setIntersectionType = useSetAtom(intersectionTypeAtom);

    const ensembleSet = useEnsembleSet(props.workbenchSession);

    React.useEffect(
        function handleTitleChange() {
            let ensembleName = "";
            if (ensembleIdent) {
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                ensembleName = ensemble?.getDisplayName() ?? "";
            }

            props.viewContext.setInstanceTitle(
                `${ensembleName}, R=${realization} -- ${gridModelName} / ${gridModelParameterName}`
            );
        },
        [ensembleSet, ensembleIdent, gridModelName, gridModelParameterName, realization, props.viewContext]
    );

    const gridCellIndexRanges = props.viewContext.useSettingsToViewInterfaceValue("gridCellIndexRanges");
    const showGridLines = props.viewContext.useSettingsToViewInterfaceValue("showGridlines");
    const showIntersection = props.viewContext.useSettingsToViewInterfaceValue("showIntersection");

    const intersectionExtensionLength =
        props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");

    const [selectedCustomIntersectionPolylineId, setSelectedCustomIntersectionPolylineId] = useAtom(
        userSelectedCustomIntersectionPolylineIdAtom
    );

    const fieldIdentifier = ensembleIdent
        ? ensembleSet.findEnsemble(ensembleIdent)?.getFieldIdentifier() ?? null
        : null;
    const fieldWellboreTrajectoriesQuery = useFieldWellboreTrajectoriesQuery(fieldIdentifier ?? undefined);

    usePropagateApiErrorToStatusWriter(fieldWellboreTrajectoriesQuery, statusWriter);

    const displayedWellboreUuid = [...wellboreUuids];
    if (highlightedWellboreUuid && !displayedWellboreUuid.includes(highlightedWellboreUuid)) {
        displayedWellboreUuid.push(highlightedWellboreUuid);
    }
    const filteredFieldWellBoreTrajectories = fieldWellboreTrajectoriesQuery.data?.filter((wellbore) =>
        displayedWellboreUuid.includes(wellbore.wellboreUuid)
    );

    const polylineUtmXy: number[] = [];
    const oldPolylineUtmXy: number[] = [];

    let intersectionReferenceSystem: IntersectionReferenceSystem | null = null;
    const customIntersectionPolyline = intersectionPolylines.getPolyline(selectedCustomIntersectionPolylineId ?? "");

    if (intersectionType === IntersectionType.WELLBORE) {
        if (filteredFieldWellBoreTrajectories && highlightedWellboreUuid) {
            const wellboreTrajectory = filteredFieldWellBoreTrajectories.find(
                (wellbore) => wellbore.wellboreUuid === highlightedWellboreUuid
            );
            if (wellboreTrajectory) {
                const path: number[][] = [];
                for (const [index, northing] of wellboreTrajectory.northingArr.entries()) {
                    const easting = wellboreTrajectory.eastingArr[index];
                    const tvd_msl = wellboreTrajectory.tvdMslArr[index];

                    path.push([easting, northing, tvd_msl]);
                }
                const offset = wellboreTrajectory.tvdMslArr[0];

                intersectionReferenceSystem = new IntersectionReferenceSystem(path);
                intersectionReferenceSystem.offset = offset;

                polylineUtmXy.push(
                    ...calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                        path,
                        intersectionExtensionLength,
                        5
                    ).simplifiedWellboreTrajectoryXy.flat()
                );

                const extendedTrajectory = intersectionReferenceSystem.getExtendedTrajectory(
                    100,
                    intersectionExtensionLength,
                    intersectionExtensionLength
                );

                oldPolylineUtmXy.push(...extendedTrajectory.points.flat());
            }
        }
    } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE) {
        if (customIntersectionPolyline && customIntersectionPolyline.points.length >= 2) {
            intersectionReferenceSystem = new IntersectionReferenceSystem(
                customIntersectionPolyline.points.map((point) => [point[0], point[1], 0])
            );
            intersectionReferenceSystem.offset = 0;
            if (!customIntersectionPolyline) {
                statusWriter.addError("Custom intersection polyline not found");
            } else {
                for (const point of customIntersectionPolyline.points) {
                    polylineUtmXy.push(point[0], point[1]);
                }
            }
        }
    }

    // Polyline intersection query
    const polylineIntersectionQuery = useGridPolylineIntersectionQuery(
        ensembleIdent ?? null,
        gridModelName,
        gridModelParameterName,
        gridModelParameterDateOrInterval,
        realization,
        polylineUtmXy,
        showIntersection
    );

    // Wellbore casing query
    const wellboreCasingQuery = useWellboreCasingsQuery(highlightedWellboreUuid ?? undefined);

    // Grid surface query
    const gridSurfaceQuery = useGridSurfaceQuery(
        ensembleIdent?.getCaseUuid() ?? null,
        ensembleIdent?.getEnsembleName() ?? null,
        gridModelName,
        realization,
        gridCellIndexRanges.i[0],
        gridCellIndexRanges.i[1],
        gridCellIndexRanges.j[0],
        gridCellIndexRanges.j[1],
        gridCellIndexRanges.k[0],
        gridCellIndexRanges.k[1]
    );

    // Grid parameter query
    const gridParameterQuery = useGridParameterQuery(
        ensembleIdent?.getCaseUuid() ?? null,
        ensembleIdent?.getEnsembleName() ?? null,
        gridModelName,
        gridModelParameterName,
        gridModelParameterDateOrInterval,
        realization,
        gridCellIndexRanges.i[0],
        gridCellIndexRanges.i[1],
        gridCellIndexRanges.j[0],
        gridCellIndexRanges.j[1],
        gridCellIndexRanges.k[0],
        gridCellIndexRanges.k[1]
    );

    usePropagateApiErrorToStatusWriter(polylineIntersectionQuery, statusWriter);
    usePropagateApiErrorToStatusWriter(wellboreCasingQuery, statusWriter);
    usePropagateApiErrorToStatusWriter(gridSurfaceQuery, statusWriter);
    usePropagateApiErrorToStatusWriter(gridParameterQuery, statusWriter);

    // Set loading status
    statusWriter.setLoading(
        polylineIntersectionQuery.isFetching ||
            fieldWellboreTrajectoriesQuery.isFetching ||
            wellboreCasingQuery.isFetching ||
            gridSurfaceQuery.isFetching ||
            gridParameterQuery.isFetching
    );

    function handleAddPolyline(polyline: IntersectionPolylineWithoutId) {
        const id = intersectionPolylines.add(polyline);
        setSelectedCustomIntersectionPolylineId(id);
        setIntersectionType(IntersectionType.CUSTOM_POLYLINE);
        const intersection: Intersection = {
            type: IntersectionType.CUSTOM_POLYLINE,
            uuid: id ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handlePolylineChange(polyline: IntersectionPolyline) {
        const { id, ...rest } = polyline;
        intersectionPolylines.updatePolyline(id, rest);
        setEditPolylineModeActive(false);
    }

    function handleEditPolylineCancel() {
        setEditPolylineModeActive(false);
    }

    if (!gridModelBoundingBox3d) {
        return null;
    }

    const northArrowLayer = new NorthArrow3DLayer({
        id: "north-arrow-layer",
        visible: true,
    });

    const axesLayer = makeAxesLayer(gridModelBoundingBox3d);

    const layers: Layer[] = [northArrowLayer, axesLayer];
    const colorScaleClone = colorScale.clone();

    if (gridSurfaceQuery.data && gridParameterQuery.data) {
        const minPropValue = gridParameterQuery.data.min_grid_prop_value;
        const maxPropValue = gridParameterQuery.data.max_grid_prop_value;
        if (!useCustomBounds) {
            colorScaleClone.setRangeAndMidPoint(
                minPropValue,
                maxPropValue,
                minPropValue + (maxPropValue - minPropValue) / 2
            );
        }
        layers.push(makeGrid3DLayer(gridSurfaceQuery.data, gridParameterQuery.data, showGridLines, colorScaleClone));

        if (polylineIntersectionQuery.data && showIntersection) {
            layers.push(makeIntersectionLayer(polylineIntersectionQuery.data, showGridLines, colorScaleClone));
        }
    }

    if (filteredFieldWellBoreTrajectories) {
        const maybeWellboreUuid = intersectionType === IntersectionType.WELLBORE ? highlightedWellboreUuid : null;
        layers.push(makeWellsLayer(filteredFieldWellBoreTrajectories, maybeWellboreUuid));
    }

    const colorScaleWithName = ColorScaleWithName.fromColorScale(
        colorScaleClone,
        gridModelParameterName ?? "Grid model"
    );

    return (
        <div className="w-full h-full">
            <SyncedSettingsUpdateWrapper
                boundingBox={gridModelBoundingBox3d ?? undefined}
                colorScale={colorScaleWithName}
                layers={layers}
                show3D
                enableIntersectionPolylineEditing
                onAddIntersectionPolyline={handleAddPolyline}
                intersectionPolyline={editPolylineModeActive ? customIntersectionPolyline : undefined}
                intersectionPolylines={intersectionPolylines.getPolylines()}
                onIntersectionPolylineChange={handlePolylineChange}
                onIntersectionPolylineEditCancel={handleEditPolylineCancel}
                wellboreUuid={highlightedWellboreUuid}
                intersectionReferenceSystem={intersectionReferenceSystem ?? undefined}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
            />
        </div>
    );
}
