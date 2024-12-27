/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Description/data for a single parameter in an ensemble
 */
export type EnsembleParameter = {
    name: string;
    is_logarithmic: boolean;
    is_discrete: boolean;
    is_constant: boolean;
    group_name: (string | null);
    descriptive_name: (string | null);
    realizations: Array<number>;
    values: (Array<number> | Array<string>);
};

