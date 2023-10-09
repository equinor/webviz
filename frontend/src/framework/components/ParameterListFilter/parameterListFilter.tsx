import React from "react";

import { Parameter } from "@framework/EnsembleParameters";
import { SmartNodeSelector, SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

// Icons placed here due to limitation of jest for testing utils (cannot import svg)
import checkIcon from "./private-assets/check.svg";
import segmentIcon from "./private-assets/segment.svg";
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
    const smartNodeSelectorDelimiter = ":";

    function computeTreeDataNodeListAndUpdateStates(): TreeDataNode[] {
        if (parameters !== null && isEqual(props.parameters, parameters)) return treeDataNodeList;

        const newTreeDataNodeList = createTreeDataNodeListFromParameters([...props.parameters], checkIcon, segmentIcon);
        setParameters(props.parameters);
        setTreeDataNodeList(newTreeDataNodeList);
        return newTreeDataNodeList;
    }
    const computedTreeDataNodeList = computeTreeDataNodeListAndUpdateStates();

    // Utilizing useEffect to prevent re-render of parent component during rendering of this component
    React.useEffect(
        function createFilterParameters() {
            if (parameters === null || parameters.length === 0) {
                setNumberOfMatchingParameters(0);
                if (props.onChange) {
                    props.onChange([]);
                }
                return;
            }

            const filteredParameters = getParametersMatchingSelectedNodes(
                parameters,
                selectedNodes,
                smartNodeSelectorDelimiter
            );
            setNumberOfMatchingParameters(filteredParameters.length);
            if (props.onChange) {
                props.onChange(filteredParameters);
            }
        },
        [selectedNodes, parameters, props.onChange]
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
                    delimiter={smartNodeSelectorDelimiter}
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
