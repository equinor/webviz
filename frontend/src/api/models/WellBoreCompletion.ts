/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WellBoreCompletion = {
    wellbore_uuid: string;
    unique_wellbore_identifier: string;
    wellbore_status: string;
    wellbore_purpose: string;
    completion_type: string;
    completion_open_flag: boolean;
    top_depth_md: number;
    base_depth_md: number;
    md_unit: string;
    date_opened: string;
    date_closed: (string | null);
};

