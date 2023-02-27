/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { StatisticValueObject } from './StatisticValueObject';

export type VectorStatisticData = {
    realizations: Array<number>;
    timestamps: Array<string>;
    value_objects: Array<StatisticValueObject>;
    unit: string;
    is_rate: boolean;
};

