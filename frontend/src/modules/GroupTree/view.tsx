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
    return (
        <div className="w-full h-full">
            
        </div>
    );
};
