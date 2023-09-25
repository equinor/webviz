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
    stratigraphy: Array<WellCompletionsZone>;
    timeSteps: Array<string>;
    wells: Array<WellCompletionsWell>;
};

