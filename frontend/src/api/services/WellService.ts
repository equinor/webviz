/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WellboreCasing } from '../models/WellboreCasing';
import type { WellboreCompletion } from '../models/WellboreCompletion';
import type { WellboreHeader } from '../models/WellboreHeader';
import type { WellboreLogCurveData } from '../models/WellboreLogCurveData';
import type { WellboreLogCurveInfo } from '../models/WellboreLogCurveInfo';
import type { WellborePerforation } from '../models/WellborePerforation';
import type { WellborePicksAndStratigraphicUnits } from '../models/WellborePicksAndStratigraphicUnits';
import type { WellboreTrajectory } from '../models/WellboreTrajectory';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WellService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Drilled Wellbore Headers
     * Get wellbore headers for all wells in the field
     * @param caseUuid Sumo case uuid
     * @returns WellboreHeader Successful Response
     * @throws ApiError
     */
    public getDrilledWellboreHeaders(
        caseUuid: string,
    ): CancelablePromise<Array<WellboreHeader>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/drilled_wellbore_headers/',
            query: {
                'case_uuid': caseUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Field Well Trajectories
     * Get well trajectories for field
     * @param caseUuid Sumo case uuid
     * @param uniqueWellboreIdentifiers Optional subset of well names
     * @returns WellboreTrajectory Successful Response
     * @throws ApiError
     */
    public getFieldWellTrajectories(
        caseUuid: string,
        uniqueWellboreIdentifiers?: Array<string>,
    ): CancelablePromise<Array<WellboreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/field_well_trajectories/',
            query: {
                'case_uuid': caseUuid,
                'unique_wellbore_identifiers': uniqueWellboreIdentifiers,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Well Trajectories
     * Get well trajectories
     * @param wellboreUuids Wellbore uuids
     * @returns WellboreTrajectory Successful Response
     * @throws ApiError
     */
    public getWellTrajectories(
        wellboreUuids: Array<string>,
    ): CancelablePromise<Array<WellboreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/well_trajectories/',
            query: {
                'wellbore_uuids': wellboreUuids,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Picks And Stratigraphic Units
     * Get well bore picks for a single well bore
     * @param caseUuid Sumo case uuid
     * @param wellboreUuid Wellbore uuid
     * @returns WellborePicksAndStratigraphicUnits Successful Response
     * @throws ApiError
     */
    public getWellborePicksAndStratigraphicUnits(
        caseUuid: string,
        wellboreUuid: string,
    ): CancelablePromise<WellborePicksAndStratigraphicUnits> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_picks_and_stratigraphic_units/',
            query: {
                'case_uuid': caseUuid,
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Completions
     * Get well bore completions for a single well bore
     * @param wellboreUuid Wellbore uuid
     * @returns WellboreCompletion Successful Response
     * @throws ApiError
     */
    public getWellboreCompletions(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellboreCompletion>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_completions/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Casing
     * Get well bore casing for a single well bore
     * @param wellboreUuid Wellbore uuid
     * @returns WellboreCasing Successful Response
     * @throws ApiError
     */
    public getWellboreCasing(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellboreCasing>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_casing/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Perforations
     * Get well bore casing for a single well bore
     * @param wellboreUuid Wellbore uuid
     * @returns WellborePerforation Successful Response
     * @throws ApiError
     */
    public getWellborePerforations(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellborePerforation>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_perforations/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Log Curve Headers
     * Get all log curve headers for a single well bore
     * @param wellboreUuid Wellbore uuid
     * @returns WellboreLogCurveInfo Successful Response
     * @throws ApiError
     */
    public getWellboreLogCurveHeaders(
        wellboreUuid: string,
    ): CancelablePromise<Array<WellboreLogCurveInfo>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_log_curve_headers/',
            query: {
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Log Curve Data
     * Get log curve data
     * @param wellboreUuid Wellbore uuid
     * @param logCurveName Log curve name
     * @returns WellboreLogCurveData Successful Response
     * @throws ApiError
     */
    public getLogCurveData(
        wellboreUuid: string,
        logCurveName: string,
    ): CancelablePromise<WellboreLogCurveData> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/log_curve_data/',
            query: {
                'wellbore_uuid': wellboreUuid,
                'log_curve_name': logCurveName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
