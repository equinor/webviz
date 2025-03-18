import type { Feature, GeometryCollection } from "geojson";

export interface WellboreGeoJsonProperties {
    uuid: string;
    name: string;
    uwi: string;
    color: number[];
    md: [number[]];
    lineWidth: number;
    wellHeadSize: number;
}

export type WellboreGeoFeature = Feature<GeometryCollection, WellboreGeoJsonProperties>;
