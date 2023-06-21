/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { StatisticValueObject } from './StatisticValueObject';

export type VectorStatisticSensitivityData = {
    realizations: Array<number>;
    timestamps: Array<string>;
    value_objects: Array<StatisticValueObject>;
    unit: string;
    is_rate: boolean;
    sensitivity_name: string;
    sensitivity_case: string;
};

