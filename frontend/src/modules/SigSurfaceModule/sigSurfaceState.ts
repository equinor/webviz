import { SurfaceStatisticFunction } from "@api";


export interface SigSurfaceState {
    ensembleName: string | null;
    surfaceType: "dynamic" | "static";
    surfaceName: string | null;
    surfaceAttribute: string | null;
    realizationNum: number;
    timeOrInterval: string | null;
    aggregation: SurfaceStatisticFunction | null;
}