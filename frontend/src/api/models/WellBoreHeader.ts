/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type WellBoreHeader = {
    wellbore_uuid: string;
    unique_wellbore_identifier: string;
    wellbore_purpose: string;
    easting?: number;
    northing?: number;
    parent_wellbore?: string;
    total_depth_driller_tvd?: number;
    total_depth_driller_md?: number;
    drill_start_date?: string;
    drill_end_date?: string;
};

