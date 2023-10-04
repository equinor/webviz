/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Completions } from './Completions';

export type WellCompletionsWell = {
    name: string;
    attributes: Record<string, (string | number | boolean)>;
    completions: Record<string, Completions>;
};

