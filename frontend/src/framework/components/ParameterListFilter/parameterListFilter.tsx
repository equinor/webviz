import React from "react";

import type { Parameter } from "@framework/EnsembleParameters";
import type { SmartNodeSelectorSelection, TreeDataNode } from "@lib/components/SmartNodeSelector";
import { SmartNodeSelector } from "@lib/components/SmartNodeSelector";
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

export type InitialParameterFilter = Extract<
    (typeof ParameterParentNodeNames)[keyof typeof ParameterParentNodeNames],
    "Continuous" | "Discrete" | "Constant" | "Nonconstant"
>;

export type ParameterListFilterProps = {
    parameters: Parameter[];
    initialFilters?: InitialParameterFilter[];
    showTitle?: boolean;
    onChange?: (filteredParameters: Parameter[]) => void;
};

export const ParameterListFilter: React.FC<ParameterListFilterProps> = (props: ParameterListFilterProps) => {
    const { onChange } = props;

    const smartNodeSelectorId = React.useId();
    const [selectedTags, setSelectedTags] = React.useState<string[]>(
        props.initialFilters ?? [ParameterParentNodeNames.IS_NONCONSTANT],
    );
    const [selectedNodes, setSelectedNodes] = React.useState<string[]>([]);
    const [numberOfMatchingParameters, setNumberOfMatchingParameters] = React.useState<number>(0);
    const [parameters, setParameters] = React.useState<Parameter[] | null>(null);
    const [previousTreeDataNodeList, setPreviousTreeDataNodeList] = React.useState<TreeDataNode[]>([]);
    const smartNodeSelectorDelimiter = ":";

    let newTreeDataNodeList: TreeDataNode[] | null = null;
    if (parameters === null || !isEqual(props.parameters, parameters)) {
        newTreeDataNodeList = createTreeDataNodeListFromParameters(props.parameters, checkIcon, segmentIcon);
        setParameters(props.parameters);
        setPreviousTreeDataNodeList(newTreeDataNodeList);
    }
    const treeDataNodeList = newTreeDataNodeList ? newTreeDataNodeList : previousTreeDataNodeList;

    // Utilizing useEffect to prevent re-render of parent component during rendering of this component
    React.useEffect(
        function createFilterParameters() {
            if (parameters === null || parameters.length === 0) {
                setNumberOfMatchingParameters(0);
                if (onChange) {
                    onChange([]);
                }
                return;
            }

            const filteredParameters = getParametersMatchingSelectedNodes(
                parameters,
                selectedNodes,
                smartNodeSelectorDelimiter,
            );
            setNumberOfMatchingParameters(filteredParameters.length);
            if (onChange) {
                onChange(filteredParameters);
            }
        },
        [selectedNodes, parameters, onChange, smartNodeSelectorDelimiter],
    );

    function handleSmartNodeSelectorChange(selection: SmartNodeSelectorSelection) {
        setSelectedTags(selection.selectedTags.map((tag) => tag.text));
        setSelectedNodes(selection.selectedNodes);
    }

    return (
        <div className={props.showTitle ? "mb-2 mt-2" : ""}>
            <>
                <SmartNodeSelector
                    id={smartNodeSelectorId}
                    delimiter={smartNodeSelectorDelimiter}
                    data={treeDataNodeList}
                    selectedTags={selectedTags}
                    label={props.showTitle ? "Parameter filtering" : undefined}
                    onChange={handleSmartNodeSelectorChange}
                    placeholder="Add new filter condition..."
                />
                <div className={resolveClassNames("text-right relative w-full mt-2 text-slate-600 text-sm")}>
                    Number of matches: {numberOfMatchingParameters}
                </div>
            </>
        </div>
    );
};
