/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Units } from './Units';
import type { Well } from './Well';
import type { Zone } from './Zone';

/**
 * Type definition for well completion data set
 */
export type WellCompletionDataSet = {
    version: string;
    units: Units;
    stratigraphy: Array<Zone>;
    timeSteps: Array<string>;
    wells: Array<Well>;
};

