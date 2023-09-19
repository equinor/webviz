/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * A generic type for a scalar response from each of the members of the ensemble.
 */
export type EnsembleScalarResponse = {
    realizations: Array<number>;
    values: Array<number>;
    name: (string | null);
    unit: (string | null);
};

