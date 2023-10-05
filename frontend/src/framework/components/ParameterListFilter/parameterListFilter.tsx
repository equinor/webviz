import React from "react";

import { Parameter } from "@framework/EnsembleParameters";
import { SmartNodeSelector, SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

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
    const smartNodeSelectorId = React.useId();
    const [selectedTags, setSelectedTags] = React.useState<string[]>([ParameterParentNodeNames.IS_NONCONSTANT]);
    const [selectedNodes, setSelectedNodes] = React.useState<string[]>([]);
    const [numberOfMatchingParameters, setNumberOfMatchingParameters] = React.useState<number>(0);
    const [parameters, setParameters] = React.useState<Parameter[] | null>(null);
    const [treeDataNodeList, setTreeDataNodeList] = React.useState<TreeDataNode[]>([]);

    let candidateTreeDataNodeList = treeDataNodeList;
    if (parameters === null || !isEqual(props.parameters, parameters)) {
        candidateTreeDataNodeList = createTreeDataNodeListFromParameters([...props.parameters]);
        setParameters(props.parameters);
        setTreeDataNodeList(candidateTreeDataNodeList);
    }
    const computedTreeDataNodeList = candidateTreeDataNodeList;

    // Utilizing useEffect to prevent re-render of parent component during rendering
    React.useEffect(
        function createFilterParameters() {
            if (parameters === null || parameters.length === 0) {
                setNumberOfMatchingParameters(0);
                if (props.onChange) {
                    props.onChange([]);
                }
                return;
            }

            const filteredParameters = getParametersMatchingSelectedNodes(parameters, selectedNodes);
            setNumberOfMatchingParameters(filteredParameters.length);
            if (props.onChange) {
                props.onChange(filteredParameters);
            }
        },
        [selectedNodes, parameters]
    );

    function handleSmartNodeSelectorChange(selection: SmartNodeSelectorSelection) {
        setSelectedTags(selection.selectedTags);
        setSelectedNodes(selection.selectedNodes);
    }

    return (
        <div className={props.showTitle ? "mb-2 mt-2" : ""}>
            <>
                <SmartNodeSelector
                    id={smartNodeSelectorId}
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
