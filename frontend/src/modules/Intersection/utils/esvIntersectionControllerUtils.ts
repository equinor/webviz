import { WellBoreTrajectory_api } from "@api";
import {
    Controller,
    OverlayMouseMoveEvent,
    SeismicCanvasLayer,
    WellborepathLayer,
    getSeismicInfo,
    getSeismicOptions,
} from "@equinor/esv-intersection";

import { makeReferenceSystemFromWellboreTrajectory } from "./esvIntersectionDataConversion";

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
export function addWellborePathLayer(controller: Controller, wellBoreTrajectory: WellBoreTrajectory_api): void {
    const referenceSystem = makeReferenceSystemFromWellboreTrajectory(wellBoreTrajectory);
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
    extension: number;
    image: ImageBitmap;
    dataValues: number[][];
    yAxisValues: number[];
};
/**
 * Utility to add seismic layer to esv intersection controller
 */
export function addSeismicLayer(
    controller: Controller,
    { curtain, extension, image, dataValues, yAxisValues }: SeismicLayerOptions
): void {
    const info = getSeismicInfo({ datapoints: dataValues, yAxisValues }, curtain);
    if (info) {
        info.minX = info.minX - extension;
        info.maxX = info.maxX - extension;
    }
    const layer = new SeismicCanvasLayer("seismic", {
        order: 1,
        layerOpacity: 1,
    });
    layer.data = { image: image, options: getSeismicOptions(info) };
    controller.addLayer(layer);
    // addSeismicOverlay(controller, dataValues);
}

export type SeismicUpdateLayoutOptions = {
    width: number;
    height: number;
    zScale: number;
    curtain: number[][] | null;
    extension: number;
};
/**
 * Utility to update layout of esv intersection controller
 */
export function updateLayout(
    controller: Controller,
    { width, height, zScale, curtain, extension }: SeismicUpdateLayoutOptions
): void {
    // Calculate midpoint for xAxis
    // Need to calculate y...

    void curtain; // TODO: Remove this line when curtain is used
    void extension; // TODO: Remove this line when extension is used
    // const _hMid: number = curtain ? (curtain[0][0] + curtain[curtain.length - 1][0]) / 2 - extension : 1000;

    // this.controller.setViewport(hMid, 1750, 5000);

    controller.adjustToSize(width, height);
    controller.zoomPanHandler.zFactor = zScale;
}
