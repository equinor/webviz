import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleSelect } from "@framework/components/EnsembleSelect";
import { ParameterListFilter } from "@framework/components/ParameterListFilter";
import { fixupEnsembleIdents } from "@framework/utils/ensembleUiHelpers";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Select } from "@lib/components/Select";

import { isEqual } from "lodash";

import { EnsembleSetParameterIdents, State } from "./state";

const MAX_PARAMETERS = 50;
export function Settings({ settingsContext, workbenchSession }: ModuleSettingsProps<State>) {
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = React.useState<EnsembleIdent[]>([]);
    const [filteredParameterIdentList, setFilteredParameterIdentList] = React.useState<ParameterIdent[]>([]);
    const setEnsembleSetParameterIdents = settingsContext.useSetStoreValue("ensembleSetParameterIdents");

    const availableEnsembleIdents = ensembleSet.getEnsembleArr().map((ens) => ens.getIdent());

    if (!isEqual(selectedEnsembleIdents, availableEnsembleIdents)) {
        const validatedEnsembleIdents = fixupEnsembleIdents(selectedEnsembleIdents, ensembleSet) ?? [];

        if (!isEqual(selectedEnsembleIdents, validatedEnsembleIdents)) {
            setSelectedEnsembleIdents(validatedEnsembleIdents);
        }
    }

    function handleEnsembleSelectChange(ensembleIdentArr: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdentArr);
    }

    // Find the intersection of all parameters in the selected ensembles
    const continuousAndNonConstantParametersIntersection: Parameter[] = [];
    const firstEnsemble = ensembleSet.findEnsemble(selectedEnsembleIdents[0]);
    if (firstEnsemble) {
        let potentialIntersectionParameters = firstEnsemble
            .getParameters()
            .getParameterArr()
            .filter((parameter) => parameter.type === ParameterType.CONTINUOUS && !parameter.isConstant);

        for (let i = 1; i < selectedEnsembleIdents.length; i++) {
            const ensembleIdent = selectedEnsembleIdents[i];
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (!ensemble) continue;

            const ensembleParameters = ensemble
                .getParameters()
                .getParameterArr()
                .filter((parameter) => parameter.type === ParameterType.CONTINUOUS && !parameter.isConstant);

            potentialIntersectionParameters = potentialIntersectionParameters.filter((parameter) =>
                ensembleParameters.some((ensembleParam) => {
                    const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
                    const ensembleParamIdent = ParameterIdent.fromNameAndGroup(
                        ensembleParam.name,
                        ensembleParam.groupName
                    );
                    return parameterIdent.equals(ensembleParamIdent);
                })
            );
        }

        continuousAndNonConstantParametersIntersection.push(...potentialIntersectionParameters);
    }
    if (continuousAndNonConstantParametersIntersection.length === 0) {
        statusWriter.addWarning("Selected ensembles have no overlapping parameters");
    }
    const [selectedParameterIdentsStrings, setSelectedParameterIdentsStrings] = React.useState<string[] | null>(null);

    function handleSelectedParameterNamesChange(parameterIdentStrings: string[]) {
        if (parameterIdentStrings.length === 0) {
            setSelectedParameterIdentsStrings(null);
            return;
        }
        setSelectedParameterIdentsStrings(parameterIdentStrings.slice(0, MAX_PARAMETERS - 1));
    }
    const handleParameterListFilterChange = React.useCallback(
        function handleParameterListFilterChange(filteredParameters: Parameter[]) {
            const filteredParamIdents = filteredParameters.map((elm) =>
                ParameterIdent.fromNameAndGroup(elm.name, elm.groupName)
            );

            setFilteredParameterIdentList(filteredParamIdents);
            handleSelectedParameterNamesChange(filteredParamIdents.map((elm) => elm.toString()));
        },
        [setFilteredParameterIdentList]
    );
    function isParameterStringAmongFilteredParameterIdents(
        parameterIdentString: string,
        filteredParameterIdentList: ParameterIdent[]
    ) {
        try {
            const parameterIdent = ParameterIdent.fromString(parameterIdentString);
            return filteredParameterIdentList.some((elm) => elm.equals(parameterIdent));
        } catch {
            return false;
        }
    }
    React.useEffect(
        function propagateParameterIdentToView() {
            if (selectedParameterIdentsStrings === null) {
                setEnsembleSetParameterIdents([]);
                return;
            }
            if (selectedEnsembleIdents.length === 0) {
                setEnsembleSetParameterIdents([]);
                return;
            }
            const newEnsembleSetParameterIdents: EnsembleSetParameterIdents[] = [];
            for (const parameterIdentStr of selectedParameterIdentsStrings) {
                if (isParameterStringAmongFilteredParameterIdents(parameterIdentStr, filteredParameterIdentList)) {
                    const parameterIdent: ParameterIdent = ParameterIdent.fromString(parameterIdentStr);
                    const ensembleIdents: EnsembleIdent[] = [];
                    for (const ensembleIdent of selectedEnsembleIdents) {
                        const ensemble = workbenchSession.getEnsembleSet().findEnsemble(ensembleIdent);
                        if (!ensemble) continue;
                        const ensembleParameters = ensemble.getParameters();
                        if (!ensembleParameters.hasParameter(parameterIdent)) continue;
                        ensembleIdents.push(ensembleIdent);
                    }
                    newEnsembleSetParameterIdents.push({
                        parameterIdent: parameterIdent,
                        ensembleIdents: ensembleIdents,
                    });
                }
            }

            setEnsembleSetParameterIdents(newEnsembleSetParameterIdents);
        },
        [
            selectedEnsembleIdents,
            selectedParameterIdentsStrings,
            filteredParameterIdentList,
            workbenchSession,
            setEnsembleSetParameterIdents,
        ]
    );

    return (
        <>
            <CollapsibleGroup expanded={true} title="Ensembles">
                <EnsembleSelect
                    ensembleSet={ensembleSet}
                    value={selectedEnsembleIdents}
                    size={5}
                    onChange={handleEnsembleSelectChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Parameters">
                <div className="mt-4 mb-4">
                    Only parameters found in all selected ensembles are shown
                    <ParameterListFilter
                        parameters={continuousAndNonConstantParametersIntersection}
                        initialFilters={["Continuous", "Nonconstant"]}
                        onChange={handleParameterListFilterChange}
                    />
                    {`Maximum ${MAX_PARAMETERS} parameters can be displayed`}
                    <Select
                        options={filteredParameterIdentList.map((elm) => {
                            return {
                                value: elm.toString(),
                                label: elm.groupName ? `${elm.groupName}:${elm.name}` : elm.name,
                            };
                        })}
                        size={20}
                        value={selectedParameterIdentsStrings ? selectedParameterIdentsStrings : undefined}
                        onChange={handleSelectedParameterNamesChange}
                        placeholder="No parameters found with current ensembles and/or parameters filter"
                        multiple={true}
                        filter={true}
                    />
                </div>
            </CollapsibleGroup>
        </>
    );
}
