/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type EnsembleParameter = {
    name: string;
    is_logarithmic: boolean;
    is_numerical: boolean;
    group_name?: string;
    descriptive_name?: string;
    realizations: Array<number>;
    values: Array<(string | number)>;
};

