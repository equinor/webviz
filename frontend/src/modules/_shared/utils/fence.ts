import { IntersectionType } from "@framework/types/intersection";

export type FenceSource = {
    type: IntersectionType;
    uuid: string;
};

export type PolylineFenceSource = FenceSource & {
    type: IntersectionType.CUSTOM_POLYLINE;
};

export type WellboreFenceSource = FenceSource & {
    type: IntersectionType.WELLBORE;
    extensionLength: number;
};

export function makeFenceSourceId(sourceSetting: PolylineFenceSource | WellboreFenceSource): string {
    switch (sourceSetting.type) {
        case IntersectionType.WELLBORE:
            return makeFenceSourceIdForWellbore(sourceSetting.uuid, sourceSetting.extensionLength);
        case IntersectionType.CUSTOM_POLYLINE:
            return makeFenceSourceIdForPolyLine(sourceSetting.uuid);
    }
}

export function makeFenceSourceIdForWellbore(wellboreId: string, extensionLength: number) {
    // ! Extension-length is included since positionAlong would be dependent on length
    return `wellbore::${wellboreId}::${extensionLength}`;
}

export function makeFenceSourceIdForPolyLine(polylineId: string) {
    return `polyline::${polylineId}`;
}

export function getPolylineIdFromFenceId(fenceId: string): string | undefined {
    const [type, id] = fenceId.split("::");

    return type === "polyline" ? id : undefined;
}
