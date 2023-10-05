import { SurfaceIntersectionData_api, WellBoreTrajectory_api } from "@api";
import {
    Annotation,
    Axis,
    CalloutCanvasLayer,
    Controller,
    GeomodelLabelsLayer,
    GeomodelLayerV2,
    GridLayer,
    IntersectionReferenceSystem,
    PixiRenderApplication,
    SeismicCanvasDataOptions,
    SeismicCanvasLayer,
    SeismicInfo,
    SurfaceData,
    Trajectory,
    WellborepathLayer,
    generateSeismicSliceImage,
    getSeismicInfo,
    getSeismicOptions,
} from "@equinor/esv-intersection";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

// import { getPicksData, transformFormationData } from "./picks";

export class ControllerHandler {
    public controller: Controller;

    constructor(controller: Controller) {
        this.controller = controller;
    }

    public init(zScale: number) {
        this.controller.addLayer(new GridLayer("grid"));
        this.controller.setBounds([0, 1000], [0, 3000]);

        this.controller.setViewport(1000, 1650, 6000);
        this.controller.zoomPanHandler.zFactor = zScale;
    }

    public destroy() {
        this.controller.destroy();
    }
    public clear() {
        this.controller.removeAllLayers();
        this.controller.clearAllData();
    }

    public addWellborePathLayer(wellBoreTrajectory: WellBoreTrajectory_api) {
        const coords = wellBoreTrajectory.easting_arr.map((easting: number, idx: number) => [
            easting,
            wellBoreTrajectory.northing_arr[idx],
            wellBoreTrajectory.tvd_msl_arr[idx],
        ]);
        this.setReferenceSystem(coords);

        this.controller.addLayer(
            new WellborepathLayer("wellborepath", {
                order: 3,
                strokeWidth: "4px",
                stroke: "black",
                referenceSystem: this.controller.referenceSystem,
            })
        );
    }
    public addSurfaceLayers(surfacIntersectionData: SurfaceIntersectionData_api[], pixiContext: PixiRenderApplication) {
        const geolayerdata = {
            areas: [],
            lines: surfacIntersectionData.map((surface, idx) => {
                return {
                    data: surface.z_arr.map((z: number, idx) => {
                        return [surface.hlen_arr[idx] - 100, z];
                    }),
                    color: "black",
                    id: surface.name,
                    label: idx === 0 ? surface.name : "",
                    width: 4,
                };
            }),
        };
        const geomodelLayer = new GeomodelLayerV2<SurfaceData>(pixiContext, "geomodel", {
            order: 3,
            layerOpacity: 0.6,
            data: geolayerdata,
        });
        const geomodelLabelsLayer = new GeomodelLabelsLayer<SurfaceData>("geomodellabels", {
            order: 3,
            data: geolayerdata,
            maxFontSize: 16,
            minFontSize: 10,
        });
        this.controller.addLayer(geomodelLayer);
        this.controller.addLayer(geomodelLabelsLayer);
    }

    // public addWellborePicksLayer(picksAndStratUnits: WellBorePicksAndStratUnits_api) {
    //     const picksData = transformFormationData(picksAndStratUnits.picks as any, picksAndStratUnits.stratUnits as any);
    //     const layer = new CalloutCanvasLayer<Annotation[]>("callout", {
    //         order: 100,
    //         data: getPicksData(picksData),
    //         referenceSystem: this.controller.referenceSystem,
    //         minFontSize: 12,
    //         maxFontSize: 16,
    //     });
    //     this.controller.addLayer(layer);
    // }

    public update(width: number, height: number, zScale: number, curtain: number[][] | null, extension: number) {
        // Calculate midpoint for xAxis
        // Need to calculate y...
        const hMid: number = curtain ? (curtain[0][0] + curtain[curtain.length - 1][0]) / 2 - extension : 1000;

        // this.controller.setViewport(hMid, 1750, 5000);

        this.controller.adjustToSize(width, height);
        this.controller.zoomPanHandler.zFactor = zScale;
    }
    private setReferenceSystem(coordinates: number[][]) {
        this.controller.setReferenceSystem(new IntersectionReferenceSystem(coordinates));
    }
}

export function addMDOverlay(instance: Controller) {
    const elm = instance.overlay.create("md", {
        onMouseMove: (event: any) => {
            const { target, caller, x } = event;
            const newX = caller.currentStateAsEvent.xScale.invert(x);
            const { referenceSystem } = caller;

            const md = referenceSystem.unproject(newX);
            target.textContent = Number.isFinite(md) ? `MD: ${md.toFixed(1)}` : "-";
            if (md < 0 || referenceSystem.length < md) {
                target.style.visibility = "hidden";
            } else {
                target.style.visibility = "visible";
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
function addSeismicOverlay(instance: Controller, seismicData: number[][]) {
    const elm = instance.overlay.create("seismic", {
        onMouseMove: (event: any) => {
            const { target, caller, x, y } = event;

            // Convert x, y screen coordinates to indices in the seismicData array
            const xIndex = caller.currentStateAsEvent.xScale.invert(x);
            const yIndex = caller.currentStateAsEvent.yScale.invert(y);

            // Check the bounds
            if (xIndex < 0 || xIndex >= seismicData[0].length || yIndex < 0 || yIndex >= seismicData.length) {
                target.style.visibility = "hidden";
                return;
            }

            const seismicValue = seismicData[Math.floor(yIndex)][Math.floor(xIndex)];

            target.textContent = seismicValue ? `Seismic: ${seismicValue.toFixed(2)}` : "-";
            target.style.visibility = "visible";
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
        elm.style.bottom = "50px";
        elm.style.zIndex = "100";
    }
}

export function makeExtendedTrajectory(
    getWellTrajectoriesQuery: UseQueryResult<WellBoreTrajectory_api[]>,
    extension: number
): Trajectory | null {
    if (getWellTrajectoriesQuery.data && getWellTrajectoriesQuery.data.length > 0) {
        const wellTrajectory = getWellTrajectoriesQuery.data[0];
        const eastingArr = wellTrajectory.easting_arr;
        const northingArr = wellTrajectory.northing_arr;
        const tvdArr = wellTrajectory.tvd_msl_arr;
        const trajectory = eastingArr.map((easting: number, idx: number) => [
            parseFloat(easting.toFixed(3)),
            parseFloat(northingArr[idx].toFixed(3)),
            parseFloat(tvdArr[idx].toFixed(3)),
        ]);
        if (
            eastingArr[0] == eastingArr[eastingArr.length - 1] &&
            northingArr[0] == northingArr[northingArr.length - 1]
        ) {
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
    return null;
}
export function useSeismicImageQuery(
    dataValues: number[][] | null,
    yValues: number[] | null,
    curtain: number[][] | null,
    colorscale: string[] | null
): UseQueryResult<any> {
    return useQuery({
        queryKey: ["seismicImage", dataValues, yValues, curtain, colorscale],
        queryFn: () =>
            generateSeismicSliceImage(
                { datapoints: dataValues ?? [], yAxisValues: yValues ?? [] },
                curtain ?? [],
                colorscale ?? [],
                {
                    isLeftToRight: true,
                }
            ),
        enabled: dataValues && yValues && curtain && colorscale ? true : false,
    });
}
