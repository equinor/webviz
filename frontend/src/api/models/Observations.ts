/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { RftObservations } from './RftObservations';
import type { SummaryVectorObservations } from './SummaryVectorObservations';

/**
 * A collection of observations associated with a field/case/ensemble
 */
export type Observations = {
    summary: Array<SummaryVectorObservations>;
    rft: Array<RftObservations>;
};

