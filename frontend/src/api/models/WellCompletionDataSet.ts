/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { WellCompletionUnits } from './WellCompletionUnits';
import type { WellCompletionWell } from './WellCompletionWell';
import type { WellCompletionZone } from './WellCompletionZone';

/**
 * Type definition for well completion data set
 */
export type WellCompletionDataSet = {
    version: string;
    units: WellCompletionUnits;
    stratigraphy: Array<WellCompletionZone>;
    timeSteps: Array<string>;
    wells: Array<WellCompletionWell>;
};

