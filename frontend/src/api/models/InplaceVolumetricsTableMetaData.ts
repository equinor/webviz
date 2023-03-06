/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { InplaceVolumetricsCategoricalMetaData } from './InplaceVolumetricsCategoricalMetaData';

export type InplaceVolumetricsTableMetaData = {
    name: string;
    categorical_column_metadata: Array<InplaceVolumetricsCategoricalMetaData>;
    numerical_column_names: Array<string>;
};

