/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { EnsembleSensitivityCase } from './EnsembleSensitivityCase';

/**
 * Description/data for a single sensitivity in an ensemble
 */
export type EnsembleSensitivity = {
    name: string;
    type: string;
    cases: Array<EnsembleSensitivityCase>;
};

