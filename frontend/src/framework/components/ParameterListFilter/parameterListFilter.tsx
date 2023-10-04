import React from "react";

import { Parameter } from "@framework/EnsembleParameters";
import { SmartNodeSelector, SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";
import { v4 } from "uuid";

import {
    ParameterParentNodeNames,
    createTreeDataNodeListFromParameters,
    getParametersMatchingSelectedNodes,
} from "./private-utils/smartNodeSelectorUtils";

export type ParameterListFilterProps = {
    parameters: Parameter[];
    showTitle?: boolean;
    onChange?: (filteredParameters: Parameter[]) => void;
};

export const ParameterListFilter: React.FC<ParameterListFilterProps> = (props: ParameterListFilterProps) => {
    const [selectedTags, setSelectedTags] = React.useState<string[]>([ParameterParentNodeNames.IS_NONCONSTANT]);
    const [numberOfMatchingParameters, setNumberOfMatchingParameters] = React.useState<number>(0);
    const [parameters, setParameters] = React.useState<Parameter[] | null>(null);
    const [treeDataNodeList, setTreeDataNodeList] = React.useState<TreeDataNode[]>([]);

    // Compare each parameter element or can one compare parameterIdent?
    let candidateTreeDataNodeList = treeDataNodeList;
    if (parameters === null || !isEqual(props.parameters, parameters)) {
        candidateTreeDataNodeList = createTreeDataNodeListFromParameters([...props.parameters]);

        setParameters(props.parameters);
        setTreeDataNodeList(candidateTreeDataNodeList);
    }

    const computedTreeDataNodeList = candidateTreeDataNodeList;

    function handleSmartNodeSelectorChange(selection: SmartNodeSelectorSelection) {
        setSelectedTags(selection.selectedTags);

        if (parameters === null) {
            if (props.onChange) {
                props.onChange([]);
            }
            return;
        }

        // Filter selection
        const filteredParameters = getParametersMatchingSelectedNodes(parameters, selection.selectedNodes);
        setNumberOfMatchingParameters(filteredParameters.length);
        if (props.onChange) {
            props.onChange(filteredParameters);
        }
    }

    return (
        <div className={props.showTitle ? "mb-2 mt-2" : ""}>
            <>
                <SmartNodeSelector
                    id={v4()}
                    data={computedTreeDataNodeList}
                    selectedTags={selectedTags}
                    label={props.showTitle ? "Parameter filtering" : undefined}
                    onChange={handleSmartNodeSelectorChange}
                    placeholder="Add new filter..."
                />
                <div className={resolveClassNames("text-right relative w-full mt-2 text-slate-600 text-sm")}>
                    Number of matches: {numberOfMatchingParameters}
                </div>
            </>
        </div>
    );
};
