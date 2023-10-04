/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { StatisticValueObject } from './StatisticValueObject';

export type VectorStatisticData = {
    realizations: Array<number>;
    timestamps_utc_ms: Array<number>;
    value_objects: Array<StatisticValueObject>;
    unit: string;
    is_rate: boolean;
};

