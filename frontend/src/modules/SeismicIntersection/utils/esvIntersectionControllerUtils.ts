import {
    Controller,
    OverlayMouseMoveEvent,
    SeismicCanvasLayer,
    WellborepathLayer,
    getSeismicInfo,
    getSeismicOptions,
} from "@equinor/esv-intersection";

import { makeReferenceSystemFromTrajectoryXyzPoints } from "./esvIntersectionDataConversion";

/**
 * Utility to add md overlay for hover to esv intersection controller
 */
export function addMDOverlay(controller: Controller) {
    const elm = controller.overlay.create("md", {
        onMouseMove: (event: OverlayMouseMoveEvent<Controller>) => {
            const { target, caller, x } = event;
            const newX = caller.currentStateAsEvent.xScale.invert(x);
            const referenceSystem = caller.referenceSystem;

            if (!referenceSystem || !target) return;

            const md = referenceSystem.unproject(newX);
            target.textContent = Number.isFinite(md) ? `MD: ${md?.toFixed(1)}` : "-";
            if (md && (md < 0 || referenceSystem.length < md)) {
                target.setAttribute("style", "visibility: hidden");
            } else {
                target.setAttribute("style", "visibility: visible");
            }
        },
        onMouseExit: (event: any) => {
            event.target.style.visibility = "hidden";
        },
    });
    if (elm) {
        elm.style.visibility = "hidden";
        elm.style.display = "inline-block";
        elm.style.padding = "2px";
        elm.style.borderRadius = "4px";
        elm.style.textAlign = "right";
        elm.style.position = "absolute";
        elm.style.backgroundColor = "rgba(0,0,0,0.5)";
        elm.style.color = "white";
        elm.style.right = "5px";
        elm.style.bottom = "5px";
        elm.style.zIndex = "100";
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
