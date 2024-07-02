import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedEnsembleIdentAtom, selectedRealizationNumberAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

