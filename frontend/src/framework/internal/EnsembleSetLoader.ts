import { EnsembleDetails_api, EnsembleParameterDescription_api, EnsembleSensitivity_api } from "@api";
import { apiService } from "@framework/ApiService";
import { QueryClient } from "@tanstack/react-query";

import { Ensemble, Sensitivity, SensitivityCase, SensitivityType } from "../Ensemble";
import { EnsembleIdent } from "../EnsembleIdent";
import { EnsembleSet } from "../EnsembleSet";

export async function loadEnsembleSetMetadataFromBackend(
    queryClient: QueryClient,
    ensemblesToLoad: EnsembleIdent[]
): Promise<EnsembleSet> {
    console.debug("loadEnsembleSetMetadataFromBackend", ensemblesToLoad);

    const STALE_TIME = 5 * 60 * 1000;
    const CACHE_TIME = 5 * 60 * 1000;
    // const STALE_TIME = 0;
    // const CACHE_TIME = 0;

    const ensembleDetailsPromiseArr: Promise<EnsembleDetails_api>[] = [];
    const sensitivityPromiseArr: Promise<EnsembleSensitivity_api[]>[] = [];
    const parametersPromiseArr: Promise<EnsembleParameterDescription_api[]>[] = [];

    for (let i = 0; i < ensemblesToLoad.length; i++) {
        const caseUuid = ensemblesToLoad[i].getCaseUuid();
        const ensembleName = ensemblesToLoad[i].getEnsembleName();

        const ensembleDetailsPromise = queryClient.fetchQuery({
            queryKey: ["getEnsembleDetails", caseUuid, ensembleName],
            queryFn: () => apiService.explore.getEnsembleDetails(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            cacheTime: CACHE_TIME,
        });
        ensembleDetailsPromiseArr.push(ensembleDetailsPromise);

        const sensitivityPromise = queryClient.fetchQuery({
            queryKey: ["getSensitivities", caseUuid, ensembleName],
            queryFn: () => apiService.parameters.getSensitivities(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            cacheTime: CACHE_TIME,
        });
        sensitivityPromiseArr.push(sensitivityPromise);

        const parametersPromise = queryClient.fetchQuery({
            queryKey: ["getParameterNamesAndDescription", caseUuid, ensembleName],
            queryFn: () => apiService.parameters.getParameterNamesAndDescription(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            cacheTime: CACHE_TIME,
        });
        parametersPromiseArr.push(parametersPromise);

        console.debug("Issued promises:", i);
    }

    const outEnsembleArr: Ensemble[] = [];

    const ensembleDetailsOutcomeArr = await Promise.allSettled(ensembleDetailsPromiseArr);
    const sensitivityOutcomeArr = await Promise.allSettled(sensitivityPromiseArr);
    const parametersOutcomeArr = await Promise.allSettled(parametersPromiseArr);

    for (let i = 0; i < sensitivityOutcomeArr.length; i++) {
        const ensembleDetailsOutcome = ensembleDetailsOutcomeArr[i];
        console.debug("ensembleDetailsOutcome:", i, ensembleDetailsOutcome.status);
        if (ensembleDetailsOutcome.status === "rejected") {
            console.error("Error fetching ensemble details, dropping ensemble:", ensemblesToLoad[i].toString());
            continue;
        }

        const ensembleDetails: EnsembleDetails_api = ensembleDetailsOutcome.value;
        if (
            ensembleDetails.case_uuid !== ensemblesToLoad[i].getCaseUuid() ||
            ensembleDetails.name !== ensemblesToLoad[i].getEnsembleName()
        ) {
            console.error("Got mismatched data from backend, dropping ensemble:", ensemblesToLoad[i].toString());
            continue;
        }

        const sensitivityOutcome = sensitivityOutcomeArr[i];
        console.debug("sensitivityOutcome:", i, sensitivityOutcome.status);
        let sensitivityArr: Sensitivity[] | null = null;
        if (sensitivityOutcome.status === "fulfilled") {
            sensitivityArr = buildSensitivityArrFromApiResponse(sensitivityOutcome.value);
        }

        const parametersOutcome = parametersOutcomeArr[i];
        console.debug("parametersOutcome:", i, parametersOutcome.status);
        // let parameterDescriptionArr: EnsembleParameterDescription[] | null = null;
        // if (sensitivityOutcome.status === "fulfilled") {
        //     // Todo: Convert and store data in our data structures here
        // }

        outEnsembleArr.push(
            new Ensemble(
                ensembleDetails.case_uuid,
                ensembleDetails.case_name,
                ensembleDetails.name,
                ensembleDetails.realizations,
                sensitivityArr
            )
        );
    }

    return new EnsembleSet(outEnsembleArr);
}

function buildSensitivityArrFromApiResponse(apiSensitivityArr: EnsembleSensitivity_api[]): Sensitivity[] {
    const retSensitivityArr: Sensitivity[] = [];

    for (const apiSens of apiSensitivityArr) {
        const caseArr: SensitivityCase[] = [];
        for (const apiCase of apiSens.cases) {
            caseArr.push({
                name: apiCase.name,
                realizations: apiCase.realizations,
            });
        }

        retSensitivityArr.push({
            name: apiSens.name,
            type: SensitivityType[apiSens.type as keyof typeof SensitivityType],
            cases: caseArr,
        });
    }

    return retSensitivityArr;
}
