import { ModuleFCProps } from "@framework/Module";
import { CircularProgress } from "@lib/components/CircularProgress";
import GroupTree from "@webviz/group-tree";

import { State, StatisticsOrRealization } from "./state";
import { useRealizationGroupTreeQuery, useStatisticsGroupTreeQuery } from "./queryHooks";
import { EnsembleIdent } from "@framework/EnsembleIdent";


export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const ensembleIdent = moduleContext.useStoreValue("ensembleIdent")
    const statOrReal = moduleContext.useStoreValue("statOrReal")
    const real = moduleContext.useStoreValue("realization")
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency")
    const statOption = moduleContext.useStoreValue("statOption")
    
    // console.log(data.data)

    let edgeOptions = [{name: "oilrate", label: "Oil Rate"}, {name: "gasrate", label: "Gas Rate"}]
    let nodeOptions = [{name: "pressure", label: "Pressure"}, {name: "wmctl", label: "WMCTL"}]

    let groupTreeQuery = undefined
    if (statOrReal === StatisticsOrRealization.Statistics) {
        groupTreeQuery = useStatisticsGroupTreeQuery(ensembleIdent?.getCaseUuid(), ensembleIdent?.getEnsembleName(), statOption, resampleFrequency)
    } else {
        groupTreeQuery = useRealizationGroupTreeQuery(ensembleIdent?.getCaseUuid(), ensembleIdent?.getEnsembleName(), real, resampleFrequency)
    }

    return (
        <div className="w-full h-full">
            {!groupTreeQuery.data ? (
                groupTreeQuery.isFetching ? (
                    <div className="absolute left-0 right-0 w-full h-full bg-white bg-opacity-80 flex items-center justify-center z-10">
                        <CircularProgress />
                    </div>                    
                ) : groupTreeQuery.status === "error" ? (
                    <div className="w-full h-full flex justify-center items-center text-red-500">
                        Error loading group tree data.
                    </div>                    
                ) : (
                    <></>
                )
            ) : (
                <GroupTree id="test_id" data={groupTreeQuery.data} edgeOptions={edgeOptions} nodeOptions={nodeOptions}/>
            )}
        </div>
    );
};
