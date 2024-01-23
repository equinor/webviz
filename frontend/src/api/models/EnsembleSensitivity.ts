/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EnsembleSensitivityCase } from './EnsembleSensitivityCase';
import type { SensitivityType } from './SensitivityType';
/**
 * Description/data for a single sensitivity in an ensemble
 */
export type EnsembleSensitivity = {
    name: string;
    type: SensitivityType;
    cases: Array<EnsembleSensitivityCase>;
};

