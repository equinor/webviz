import { PolygonData_api, WellBoreTrajectory_api } from "@api";
import { FaultPolygonsLayer as ATFaultPolygonsLayer } from "@webviz/subsurface-viewer/dist/layers/";

import { Feature, FeatureCollection } from "geojson";

import { createFaultPolygonsFeatureCollection } from "./data";

export class FaultPolygonsLayer {
    private data: FeatureCollection = { type: "FeatureCollection", features: [] };
    private id: string = "fault-polygon-layer";

    constructor(id?: string) {
        this.id = id || this.id;
    }
    public setData(polygonsData: PolygonData_api[]) {
        this.data = createFaultPolygonsFeatureCollection(polygonsData);
    }

    public getId() {
        return this.id;
    }

    public getLayer(): ATFaultPolygonsLayer {
        return new ATFaultPolygonsLayer({
            id: this.id,
            data: this.data,
            opacity: 0.5,
            depthTest: false,
            pickable: true,
            filled: true,
        });
    }
}
