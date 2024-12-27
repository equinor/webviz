/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WellCompletionsUnits } from './WellCompletionsUnits';
import type { WellCompletionsWell } from './WellCompletionsWell';
import type { WellCompletionsZone } from './WellCompletionsZone';
/**
 * Type definition for well completions data
 */
export type WellCompletionsData = {
    version: string;
    units: WellCompletionsUnits;
    zones: Array<WellCompletionsZone>;
    sortedCompletionDates: Array<string>;
    wells: Array<WellCompletionsWell>;
};

