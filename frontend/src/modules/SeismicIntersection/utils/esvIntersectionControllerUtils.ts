import {
    Annotation,
    CalloutCanvasLayer,
    Controller,
    GeomodelCanvasLayer,
    GeomodelLabelsLayer,
    OverlayMouseExitEvent,
    OverlayMouseMoveEvent,
    SeismicCanvasLayer,
    SurfaceData,
    WellborepathLayer,
    getPicksData,
    getSeismicInfo,
    getSeismicOptions,
    transformFormationData,
} from "@equinor/esv-intersection";

import { makeReferenceSystemFromTrajectoryXyzPoints } from "./esvIntersectionDataConversion";
import { Pick, Unit } from "./esvIntersectionTypes";

/**
 * Utility to add md overlay for hover to esv intersection controller
 */
export function addMDOverlay(controller: Controller) {
    const elm = controller.overlay.create("md", {
        onMouseMove: (event: OverlayMouseMoveEvent<Controller>) => {
            const { target, caller, x } = event;
            const newX = caller.currentStateAsEvent.xScale.invert(x);
            const referenceSystem = caller.referenceSystem;

            if (!referenceSystem || !(target instanceof HTMLElement)) return;

            const md = referenceSystem.unproject(newX);
            target.textContent = Number.isFinite(md) ? `MD: ${md?.toFixed(1)}` : "-";
            if (md && (md < 0 || referenceSystem.length < md)) {
                target.classList.replace("visible", "invisible");
            } else {
                target.classList.replace("invisible", "visible");
            }
        },
        onMouseExit: (event: OverlayMouseExitEvent<Controller>) => {
            if (event.target instanceof HTMLElement) {
                event.target.classList.replace("visible", "invisible");
            }
        },
    });

    if (elm) {
        elm.classList.add(
            "invisible",
            "inline-block",
            "p-1",
            "rounded",
            "text-right",
            "absolute",
            "bg-black",
            "bg-opacity-20",
            "text-white",
            "z-100"
        );
    }
}

/**
 * Utility to add well bore trajectory to esv intersection controller
 *
 * Sets reference system with trajectory 3D coordinates, controller reference system must be handled outside
 */
export function addWellborePathLayer(controller: Controller, wellboreTrajectoryXyzPoints: number[][]): void {
    const referenceSystem = makeReferenceSystemFromTrajectoryXyzPoints(wellboreTrajectoryXyzPoints);
    controller.addLayer(
        new WellborepathLayer("wellborepath", {
            order: 3,
            strokeWidth: "4px",
            stroke: "black",
            referenceSystem: referenceSystem,
        })
    );
}

export type SeismicLayerOptions = {
    curtain: number[][];
    xAxisOffset: number;
    image: ImageBitmap;
    dataValues: number[][];
    yAxisValues: number[];
};
/**
 * Utility to add seismic layer to esv intersection controller
 */
export function addSeismicLayer(
    controller: Controller,
    { curtain, xAxisOffset, image, dataValues, yAxisValues }: SeismicLayerOptions
): void {
    const info = getSeismicInfo({ datapoints: dataValues, yAxisValues }, curtain);
    if (info) {
        // Adjust x axis offset to account for curtain
        info.minX = info.minX - xAxisOffset;
        info.maxX = info.maxX - xAxisOffset;
    }
    const layer = new SeismicCanvasLayer("seismic", {
        order: 1,
        layerOpacity: 1,
    });
    layer.data = { image: image, options: getSeismicOptions(info) };
    controller.addLayer(layer);
}

export type SurfaceIntersectionData = {
    name: string;
    xyPoints: number[][]; // [x, y] points for surface intersection line in reference system
};

export type SurfacesLayerOptions = {
    surfaceIntersectionDataList: SurfaceIntersectionData[];
    layerName: string;
    surfaceColor: string;
    surfaceWidth: number;
};
export function addSurfacesLayer(
    controller: Controller,
    { surfaceIntersectionDataList, layerName, surfaceColor, surfaceWidth }: SurfacesLayerOptions
): void {
    const surfaceIndicesWithLabels: { label: string; idx: number }[] = [];
    surfaceIntersectionDataList.forEach((surface, idx) => {
        if (surface.name !== surfaceIndicesWithLabels[surfaceIndicesWithLabels.length - 1]?.label) {
            surfaceIndicesWithLabels.push({ label: surface.name, idx: idx });
        }
    });

    // Create surface intersection lines
    const surfaceIntersectionLines: SurfaceData = {
        areas: [],
        lines: surfaceIntersectionDataList.map((surface) => {
            return {
                data: surface.xyPoints,
                color: surfaceColor,
                id: `${surface.name}-id`,
                label: surface.name,
                width: surfaceWidth,
            };
        }),
    };

    const geomodelLayer = new GeomodelCanvasLayer(`${layerName}`, {
        order: 3,
        layerOpacity: 0.6,
        data: surfaceIntersectionLines,
    });
    const geomodelLabelsLayer = new GeomodelLabelsLayer<SurfaceData>(`${layerName}labels`, {
        order: 3,
        data: surfaceIntersectionLines,
        maxFontSize: 16,
        minFontSize: 10,
    });
    controller.addLayer(geomodelLayer);
    controller.addLayer(geomodelLabelsLayer);
}

export function addWellborePicksLayer(controller: Controller, wellborePicks: Pick[], stratigraphicUnits: Unit[]) {
    const picksData = transformFormationData(wellborePicks, stratigraphicUnits);

    const layer = new CalloutCanvasLayer<Annotation[]>("callout", {
        order: 100,
        data: getPicksData(picksData),
        referenceSystem: controller.referenceSystem,
        minFontSize: 12,
        maxFontSize: 16,
    });
    controller.addLayer(layer);
}
