import { SmdaWellBoreAddress } from "@modules/_shared/WellBore/wellBoreAddress";

import { ViewSpecification, WellsSpecification } from "./types";

export const mapMatrixDefaultState: State = {
    viewSpecifications: [],
    wellsSpecification: {
        smdaWellBoreAddresses: [],
        useFilterTvdAbove: false,
        useFilterTvdBelow: false,
        filterTvdAbove: 1500,
        filterTvdBelow: 2000,
        showWellNames: false,
        showWellTrajectories: true,
        showWellMarkers: false,
    },
};
export type State = {
    viewSpecifications: ViewSpecification[];
    wellsSpecification: WellsSpecification;
};
