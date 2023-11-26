import { ModuleFCProps } from "@framework/Module";
import { CircularProgress } from "@lib/components/CircularProgress";
import GroupTree from "@webviz/group-tree";

import { State, StatisticsOrRealization } from "./state";
import { useGroupTreeQuery } from "./queryHooks";
import { EnsembleIdent } from "@framework/EnsembleIdent";


export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const ensembleIdent = moduleContext.useStoreValue("ensembleIdent")
    const statOrReal = moduleContext.useStoreValue("statOrReal")
    const real = moduleContext.useStoreValue("realization")
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency")

    const data = useGroupTreeQuery(ensembleIdent?.getCaseUuid(), ensembleIdent?.getEnsembleName(), real, resampleFrequency)
    
    // console.log(data.data)

    let edgeOptions = [{name: "oilrate", label: "Oil Rate"}, {name: "gasrate", label: "Gas Rate"}]
    let nodeOptions = [{name: "pressure", label: "Pressure"}, {name: "wmctl", label: "WMCTL"}]

    if (statOrReal === StatisticsOrRealization.Statistics) {
        return <div>Statistical option is not implemented.</div>
    }

    return (
        <div className="w-full h-full">
            {!data.data ? (
                <div>Loading...</div>
            ) : (
                <GroupTree id="test_id" data={data.data} edgeOptions={edgeOptions} nodeOptions={nodeOptions}/>
        
            )}
        </div>
    );
};
