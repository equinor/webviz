import React from "react";

import { isEqual } from "lodash";

import type { Parameter } from "@framework/EnsembleParameters";
import type { SmartNodeSelectorSelection, TreeDataNode } from "@lib/newComponents/SmartNodeSelector";
import { SmartNodeSelector } from "@lib/newComponents/SmartNodeSelector";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

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
    disabled?: boolean;
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
        newTreeDataNodeList = createTreeDataNodeListFromParameters(props.parameters);
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
        <div className={props.showTitle ? "mt-2xs mb-2xs" : ""}>
            <>
                <SmartNodeSelector
                    id={smartNodeSelectorId}
                    delimiter={smartNodeSelectorDelimiter}
                    data={treeDataNodeList}
                    selectedTags={selectedTags}
                    onValueChange={handleSmartNodeSelectorChange}
                    placeholder="Add new filter condition..."
                    disabled={props.disabled}
                />
                <div
                    className={resolveClassNames("mt-2xs text-body-sm text-neutral-subtle relative w-full text-right")}
                >
                    Number of matches: {numberOfMatchingParameters}
                </div>
            </>
        </div>
    );
};
