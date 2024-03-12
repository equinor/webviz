import { SmdaWellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

import { SurfaceSpecification } from "./types";

export const defaultState: State = {
    surfaceSpecifications: [],
    smdaWellBoreAddresses: [],
};
export type State = {
    surfaceSpecifications: SurfaceSpecification[];
    smdaWellBoreAddresses: SmdaWellBoreAddress[];
};
