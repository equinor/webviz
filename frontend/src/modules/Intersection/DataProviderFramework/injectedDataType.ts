import type { IntersectionReferenceSystem } from "@equinor/esv-intersection";

export type IntersectionInjectedData = Record<string, any> & {
    intersectionReferenceSystem: IntersectionReferenceSystem | undefined;
};
