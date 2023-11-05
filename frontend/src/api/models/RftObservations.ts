/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RftObservation } from './RftObservation';
/**
 * A collection of RFT (Repeat Formation Tester) observations for a specific well at a specific date.
 *
 * Attributes:
 * well (str): Unique well identifier
 * date (str): Observation date
 * comment (Optional[str]): An optional comment associated with the collection of observations.
 * observations (List[RftObservation]): A list of RFT observations associated with this collection.
 */
export type RftObservations = {
    well: string;
    date: string;
    comment?: (string | null);
    observations: Array<RftObservation>;
};

