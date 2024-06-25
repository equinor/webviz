export enum IntersectionType {
    WELLBORE = "wellbore",
    CUSTOM_POLYLINE = "customPolyline",
}

export type Intersection = {
    type: IntersectionType;
    uuid: string;
};
