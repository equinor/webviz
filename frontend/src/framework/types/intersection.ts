export enum IntersectionType {
    WELLBORE = "wellbore",
    PLANNED_WELLBORE = "plannedWellbore",
    CUSTOM_POLYLINE = "customPolyline",
}

export type Intersection = {
    type: IntersectionType;
    uuid: string;
};

/**
 * Returns true for intersection types backed by a wellbore trajectory (drilled or planned).
 *
 * Drilled and planned wellbores are handled identically for intersection purposes (same trajectory
 * arrays, extension length and reference-system creation); they only differ in which API endpoint
 * provides the data and that planned wellbores have no casing data.
 */
export function isWellboreIntersectionType(
    type: IntersectionType | null | undefined,
): type is IntersectionType.WELLBORE | IntersectionType.PLANNED_WELLBORE {
    return type === IntersectionType.WELLBORE || type === IntersectionType.PLANNED_WELLBORE;
}
