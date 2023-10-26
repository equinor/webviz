import { WellBoreTrajectory_api } from "@api";
import {
    Controller,
    IntersectionReferenceSystem,
    OverlayMouseMoveEvent,
    SeismicCanvasLayer,
    Trajectory,
    WellborepathLayer,
    getSeismicInfo,
    getSeismicOptions,
} from "@equinor/esv-intersection";

/**
 * Utility to make extended trajectory object from wellbore trajectory
 */
export function makeExtendedTrajectory(wellboreTrajectory: WellBoreTrajectory_api, extension: number): Trajectory {
    const eastingArr = wellboreTrajectory.easting_arr;
    const northingArr = wellboreTrajectory.northing_arr;
    const tvdArr = wellboreTrajectory.tvd_msl_arr;
    const trajectory = eastingArr.map((easting: number, idx: number) => [
        parseFloat(easting.toFixed(3)),
        parseFloat(northingArr[idx].toFixed(3)),
        parseFloat(tvdArr[idx].toFixed(3)),
    ]);
    if (eastingArr[0] == eastingArr[eastingArr.length - 1] && northingArr[0] == northingArr[northingArr.length - 1]) {
        const addcoordatstart = eastingArr[0] - 100;
        const addcoordatend = eastingArr[eastingArr.length - 1] + 100;
        const addcoordatstart2 = northingArr[0] - 100;
        const addcoordatend2 = northingArr[northingArr.length - 1] + 100;
        const firstzcoord = tvdArr[0];
        const lastzcoord = tvdArr[tvdArr.length - 1];

        trajectory.unshift([addcoordatstart, addcoordatstart2, firstzcoord]);
        trajectory.push([addcoordatend, addcoordatend2, lastzcoord]);
    }

    const referenceSystem = new IntersectionReferenceSystem(trajectory);
    referenceSystem.offset = trajectory[0][2]; // Offset should be md at start of path

    const displacement = referenceSystem.displacement || 1;
    // Number of samples. Needs some thought.
    const samplingIncrement = 5; //meters
    const steps = Math.min(1000, Math.floor((displacement + extension * 2) / samplingIncrement));
    console.debug("Number of samples for intersection ", steps);
    const traj = referenceSystem.getExtendedTrajectory(steps, extension, extension);
    traj.points = traj.points.map((point) => [parseFloat(point[0].toFixed(3)), parseFloat(point[1].toFixed(3))]);
    return traj;
}

/**
 * Utility to add md overlay for hover to esv intersection controller
 */
export function addMDOverlay(controller: Controller) {
    const elm = controller.overlay.create("md", {
        // onMouseMove: (event: any) => {
        onMouseMove: (event: OverlayMouseMoveEvent<Controller>) => {
            const { target, caller, x } = event;
            const newX = caller.currentStateAsEvent.xScale.invert(x);
            const referenceSystem = caller.referenceSystem;

            if (!referenceSystem || !target) return;

            const md = referenceSystem.unproject(newX);
            target.textContent = Number.isFinite(md) ? `MD: ${md?.toFixed(1)}` : "-";
            if (md && (md < 0 || referenceSystem.length < md)) {
                target.setAttribute("style", "visibility: hidden");
                // target.style.visibility = "hidden";
            } else {
                // target.style.visibility = "visible";
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
 * Utility to add well bore trajectory and set reference system to esv intersection controller
 *
 * Sets reference system with trajectory coordinates - overriding any existing reference system
 */
export function addWellborePathLayerAndSetReferenceSystem(
    controller: Controller,
    wellBoreTrajectory: WellBoreTrajectory_api
): void {
    if (
        wellBoreTrajectory.easting_arr.length !== wellBoreTrajectory.northing_arr.length &&
        wellBoreTrajectory.northing_arr.length !== wellBoreTrajectory.tvd_msl_arr.length
    ) {
        throw new Error("Wellbore trajectory coordinate arrays are not of equal length");
    }

    const coords = wellBoreTrajectory.easting_arr.map((easting: number, idx: number) => [
        easting,
        wellBoreTrajectory.northing_arr[idx],
        wellBoreTrajectory.tvd_msl_arr[idx],
    ]);

    controller.setReferenceSystem(new IntersectionReferenceSystem(coords));

    controller.addLayer(
        new WellborepathLayer("wellborepath", {
            order: 3,
            strokeWidth: "4px",
            stroke: "black",
            referenceSystem: controller.referenceSystem,
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
    const _hMid: number = curtain ? (curtain[0][0] + curtain[curtain.length - 1][0]) / 2 - extension : 1000;

    // this.controller.setViewport(hMid, 1750, 5000);

    controller.adjustToSize(width, height);
    controller.zoomPanHandler.zFactor = zScale;
}
