import { ModuleFCProps } from "@framework/Module";
import { CircularProgress } from "@lib/components/CircularProgress";
import GroupTree from "@webviz/group-tree";

import { State } from "./state";
import { useGroupTreeQuery } from "./queryHooks";
import { EnsembleIdent } from "@framework/EnsembleIdent";

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const ensembleIdent = moduleContext.useStoreValue("ensembleIdent")
    const statOrReal = moduleContext.useStoreValue("statOrReal")
    const data = useGroupTreeQuery(ensembleIdent?.getCaseUuid(), ensembleIdent?.getEnsembleName(), 0)
    console.log("data:")
    console.log(data.data)

    let edgeOptions = [{name: "oilrate", label: "Oil Rate"}]
    let nodeOptions = [{name: "thp", label: "THP"}]
    return (
        <div className="w-full h-full">
            {!data.data ? (
                <div>Loading</div>
            ) : (
                <GroupTree id="test_id" data={data.data} edgeOptions={edgeOptions} nodeOptions={nodeOptions}/>
        
            )}
        </div>
    );
};

// def create_grouptree_dataset(
//     self,
//     tree_mode: TreeModeOptions,
//     stat_option: StatOptions,
//     real: int,
//     node_types: List[NodeType],
// ) -> Tuple[List[Dict[Any, Any]], List[Dict[str, str]], List[Dict[str, str]]]: