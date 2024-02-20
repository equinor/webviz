import { SurfaceSpecification } from "./types";

export const defaultState: State = {
    surfaceSpecifications: [],
};
export type State = { surfaceSpecifications: SurfaceSpecification[] };
