/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SummaryVectorDateObservation } from './SummaryVectorDateObservation';
/**
 * A collection of observations of a summary vector.
 */
export type SummaryVectorObservations = {
    vector_name: string;
    comment?: (string | null);
    observations: Array<SummaryVectorDateObservation>;
};

