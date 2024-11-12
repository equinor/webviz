import { EnsembleDetails_api, EnsembleParameter_api, EnsembleSensitivity_api } from "@api";
import { apiService } from "@framework/ApiService";
import { UserEnsembleSetting } from "@framework/Workbench";
import { QueryClient } from "@tanstack/react-query";

import { Ensemble } from "../Ensemble";
import { EnsembleIdent } from "../EnsembleIdent";
import { ContinuousParameter, DiscreteParameter, Parameter, ParameterType } from "../EnsembleParameters";
import { Sensitivity, SensitivityCase } from "../EnsembleSensitivities";
import { EnsembleSet } from "../EnsembleSet";

export async function loadEnsembleSetMetadataFromBackend(
    queryClient: QueryClient,
    userEnsembleSettings: UserEnsembleSetting[]
): Promise<EnsembleSet> {
    const ensembleIdentsToLoad: EnsembleIdent[] = userEnsembleSettings.map((setting) => setting.ensembleIdent);

    console.debug("loadEnsembleSetMetadataFromBackend", ensembleIdentsToLoad);

    const STALE_TIME = 5 * 60 * 1000;
    const CACHE_TIME = 5 * 60 * 1000;

    const ensembleDetailsPromiseArr: Promise<EnsembleDetails_api>[] = [];
    const parametersPromiseArr: Promise<EnsembleParameter_api[]>[] = [];
    const sensitivitiesPromiseArr: Promise<EnsembleSensitivity_api[]>[] = [];

    for (const ensembleIdent of ensembleIdentsToLoad) {
        const caseUuid = ensembleIdent.getCaseUuid();
        const ensembleName = ensembleIdent.getEnsembleName();

        const ensembleDetailsPromise = queryClient.fetchQuery({
            queryKey: ["getEnsembleDetails", caseUuid, ensembleName],
            queryFn: () => apiService.explore.getEnsembleDetails(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        ensembleDetailsPromiseArr.push(ensembleDetailsPromise);

        const parametersPromise = queryClient.fetchQuery({
            queryKey: ["getParameters", caseUuid, ensembleName],
            queryFn: () => apiService.parameters.getParameters(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        parametersPromiseArr.push(parametersPromise);

        const sensitivitiesPromise = queryClient.fetchQuery({
            queryKey: ["getSensitivities", caseUuid, ensembleName],
            queryFn: () => apiService.parameters.getSensitivities(caseUuid, ensembleName),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
        sensitivitiesPromiseArr.push(sensitivitiesPromise);
    }
    console.debug(`Issued ${ensembleDetailsPromiseArr.length} promise(s)`);

    const outEnsembleArr: Ensemble[] = [];

    const ensembleDetailsOutcomeArr = await Promise.allSettled(ensembleDetailsPromiseArr);
    const parametersOutcomeArr = await Promise.allSettled(parametersPromiseArr);
    const sensitivitiesOutcomeArr = await Promise.allSettled(sensitivitiesPromiseArr);

    for (let i = 0; i < ensembleDetailsOutcomeArr.length; i++) {
        const ensembleDetailsOutcome = ensembleDetailsOutcomeArr[i];
        console.debug(`ensembleDetailsOutcome[${i}]:`, ensembleDetailsOutcome.status);
        if (ensembleDetailsOutcome.status === "rejected") {
            console.error("Error fetching ensemble details, dropping ensemble:", ensembleIdentsToLoad[i].toString());
            continue;
        }

        const ensembleDetails: EnsembleDetails_api = ensembleDetailsOutcome.value;
        if (
            ensembleDetails.case_uuid !== ensembleIdentsToLoad[i].getCaseUuid() ||
            ensembleDetails.name !== ensembleIdentsToLoad[i].getEnsembleName()
        ) {
            console.error("Got mismatched data from backend, dropping ensemble:", ensembleIdentsToLoad[i].toString());
            continue;
        }

        const parametersOutcome = parametersOutcomeArr[i];
        console.debug(`parametersOutcome[${i}]:`, parametersOutcome.status);
        let parameterArr: Parameter[] = [];
        if (parametersOutcome.status === "fulfilled") {
            parameterArr = buildParameterArrFromApiResponse(parametersOutcome.value);
        }

        const sensitivitiesOutcome = sensitivitiesOutcomeArr[i];
        console.debug(`sensitivitiesOutcome[${i}]:`, sensitivitiesOutcome.status);
        let sensitivityArr: Sensitivity[] | null = null;
        if (sensitivitiesOutcome.status === "fulfilled") {
            sensitivityArr = buildSensitivityArrFromApiResponse(sensitivitiesOutcome.value);
        }

        outEnsembleArr.push(
            new Ensemble(
                ensembleDetails.field_identifier,
                ensembleDetails.case_uuid,
                ensembleDetails.case_name,
                ensembleDetails.name,
                ensembleDetails.stratigraphic_column_identifier,
                ensembleDetails.realizations,
                parameterArr,
                sensitivityArr,
                userEnsembleSettings[i].color,
                userEnsembleSettings[i].customName
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
            type: apiSens.type,
            cases: caseArr,
        });
    }

    return retSensitivityArr;
}

function buildParameterArrFromApiResponse(apiParameterArr: EnsembleParameter_api[]): Parameter[] {
    const retParameterArr: Parameter[] = [];

    for (const apiPar of apiParameterArr) {
        if (apiPar.is_discrete) {
            const retPar: DiscreteParameter = {
                type: ParameterType.DISCRETE,
                name: apiPar.name,
                groupName: apiPar.group_name,
                description: apiPar.descriptive_name,
                isConstant: apiPar.is_constant,
                realizations: apiPar.realizations,
                values: apiPar.values,
            };
            retParameterArr.push(retPar);
        } else {
            const retPar: ContinuousParameter = {
                type: ParameterType.CONTINUOUS,
                name: apiPar.name,
                groupName: apiPar.group_name,
                description: apiPar.descriptive_name,
                isConstant: apiPar.is_constant,
                isLogarithmic: apiPar.is_logarithmic,
                realizations: apiPar.realizations,
                values: apiPar.values as number[],
            };
            retParameterArr.push(retPar);
        }
    }

    return retParameterArr;
}
