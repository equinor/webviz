/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { PolygonsAttributeType } from './PolygonsAttributeType';

export type PolygonsMeta = {
    name: string;
    name_is_stratigraphic_offical: boolean;
    stratigraphic_identifier: (string | null);
    relative_stratigraphic_level: (number | null);
    parent_stratigraphic_identifier: (string | null);
    attribute_name: string;
    attribute_type: PolygonsAttributeType;
};

