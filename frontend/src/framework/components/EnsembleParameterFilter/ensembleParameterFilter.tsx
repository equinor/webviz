import React from "react";

import { EnsembleParameters, Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { CallbackFunction } from "@framework/WorkbenchServices";
import { Label } from "@lib/components/Label";
import { SmartNodeSelector, SmartNodeSelectorSelection } from "@lib/components/SmartNodeSelector";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";

import { isEqual } from "lodash";
import { v4 } from "uuid";

const ParameterPropertyNames = {
    TYPE: "Type",
    NAME: "Name",
    GROUP: "Group",
    DESCRIPTION: "Description",
    IS_CONSTANT: "Constant",
    IS_NON_CONSTANT: "Not constant",
    IS_LOGARITHMIC: "Logarithmic",
    IS_LINEAR: "Linear",
};

// TODO: Decide wether to use EnsembleParameters class or Parameter[] in interface
// - I.e.: Name EnsembleParameterFilter vs ParametersFilter?
export type EnsembleParameterFilterProps = {
    ensembleParameters: EnsembleParameters;
    onChange?: (ensembleParameters: EnsembleParameters) => void;
};

export const EnsembleParameterFilter: React.FC<EnsembleParameterFilterProps> = (
    props: EnsembleParameterFilterProps
) => {
    // TODO:
    // - Add state for selectedTags? If props.ensembleParameters is changed, it might not contain e.g. isLogarithmic if only discrete parameters are provided,
    //   thus the selectedTags not among new valid selections should be removed?
    // -

    const [ensembleParameters, setEnsembleParameters] = React.useState<EnsembleParameters | null>(null);
    const [treeDataNodeList, setTreeDataNodeList] = React.useState<TreeDataNode[]>([]);

    // Compare each parameter element or can one compare parameterIdent?
    let candidateEnsembleParameters = ensembleParameters;
    let candidateTreeDataNodeList = treeDataNodeList;
    if (
        ensembleParameters === null ||
        !isEqual(props.ensembleParameters.getParameterArr(), ensembleParameters.getParameterArr())
    ) {
        candidateEnsembleParameters = props.ensembleParameters;
        candidateTreeDataNodeList = createTreeDataNodeListFromParameters([
            ...props.ensembleParameters.getParameterArr(),
        ]);

        // TODO:
        // - Update selected tags if they are not among the new valid selections? E.g.: isLogarithmic if only discrete parameters

        setEnsembleParameters(props.ensembleParameters);
        setTreeDataNodeList(candidateTreeDataNodeList);
    }
    const computedEnsembleParameters = candidateEnsembleParameters;
    const computedTreeDataNodeList = candidateTreeDataNodeList;

    function handleSmartNodeSelectorChange(selection: SmartNodeSelectorSelection) {
        // TODO:
        // - If selected tags state is introduced - update it here
        // - Use React.callback as ensembleParameters state can change?

        const selectedNodes = selection.selectedNodes;

        // Use the ensembleParameters state to retrieve Parameters matching selection
        if (ensembleParameters === null) {
            const output = new EnsembleParameters([]);
            if (props.onChange) {
                props.onChange(output);
            }
            return;
        }

        // Filter selection
        const filteredEnsembleParameters = getEnsembleParametersMatchingSelectedNodes(
            ensembleParameters,
            selectedNodes
        );
        if (props.onChange) {
            props.onChange(filteredEnsembleParameters);
        }
    }

    return (
        <Label text="Parameter filtering" wrapperClassName="mt-4 mb-4 flex flex-col gap-2 overflow-y-auto">
            <SmartNodeSelector
                id={v4()}
                data={computedTreeDataNodeList}
                onChange={handleSmartNodeSelectorChange}
                placeholder="Add new filter..."
            />
        </Label>
    );
};

function addParameterToTreeDataNodeList(treeNodeDataList: TreeDataNode[], parameter: Parameter): void {
    const findOrCreateNode = (treeNodeDataList: TreeDataNode[], nodeName: string): TreeDataNode => {
        const existingNode = treeNodeDataList.find((node) => node.name === nodeName);
        if (existingNode) {
            return existingNode;
        }

        const newNode: TreeDataNode = { name: nodeName };
        treeNodeDataList.push(newNode);
        return newNode;
    };

    // Parameter Type
    const parameterTypeStr = fromParameterTypeToString(parameter.type);
    const typeParentNode = findOrCreateNode(treeNodeDataList, ParameterPropertyNames.TYPE);
    if (!typeParentNode.children) {
        typeParentNode.children = [];
    }
    findOrCreateNode(typeParentNode.children, parameterTypeStr);

    // Parameter Name
    const nameParentNode = findOrCreateNode(treeNodeDataList, ParameterPropertyNames.NAME);
    if (!nameParentNode.children) {
        nameParentNode.children = [];
    }
    findOrCreateNode(nameParentNode.children, parameter.name);

    // Parameter Group
    if (parameter.groupName) {
        const groupParentNode = findOrCreateNode(treeNodeDataList, ParameterPropertyNames.GROUP);
        if (!groupParentNode.children) {
            groupParentNode.children = [];
        }
        findOrCreateNode(groupParentNode.children, parameter.groupName);
    }

    // Parameter Description
    if (parameter.description) {
        const descriptionParentNode = findOrCreateNode(treeNodeDataList, ParameterPropertyNames.DESCRIPTION);
        if (!descriptionParentNode.children) {
            descriptionParentNode.children = [];
        }
        findOrCreateNode(descriptionParentNode.children, parameter.description);
    }

    // Parameter is constant/non-constant
    findOrCreateNode(treeNodeDataList, ParameterPropertyNames.IS_CONSTANT);
    findOrCreateNode(treeNodeDataList, ParameterPropertyNames.IS_NON_CONSTANT);

    // Parameter is logarithmic/linear
    if (parameter.type === ParameterType.CONTINUOUS) {
        findOrCreateNode(treeNodeDataList, ParameterPropertyNames.IS_LOGARITHMIC);
        findOrCreateNode(treeNodeDataList, ParameterPropertyNames.IS_LINEAR);
    }
}
function createTreeDataNodeListFromParameters(parameters: Parameter[]): TreeDataNode[] {
    const treeDataNodeList: TreeDataNode[] = [];
    parameters.forEach((parameter) => {
        addParameterToTreeDataNodeList(treeDataNodeList, parameter);
    });

    return treeDataNodeList;
}

// From SmartNodeSelector selected nodes to EnsembleParameters
function getEnsembleParametersMatchingSelectedNodes(
    ensembleParameters: EnsembleParameters,
    selectedNodes: string[]
): EnsembleParameters {
    if (selectedNodes.length === 0) {
        return ensembleParameters;
    }

    const delimiter = ":";
    const findSelectedParameterPropertiesFromName = (propertyName: string): string[] => {
        return selectedNodes
            .filter((node) => node.split(delimiter, 1)[0] === propertyName)
            .map((node) => node.split(delimiter, 2)[1]);
    };

    // Get parameter property filters
    const selectedParameterTypes = findSelectedParameterPropertiesFromName(ParameterPropertyNames.TYPE).map(
        (typeString) => fromStringToParameterType(typeString)
    );
    const selectedParameterNames = findSelectedParameterPropertiesFromName(ParameterPropertyNames.NAME);
    const selectedParameterGroups = findSelectedParameterPropertiesFromName(ParameterPropertyNames.GROUP);
    const selectedParameterDescriptions = findSelectedParameterPropertiesFromName(ParameterPropertyNames.DESCRIPTION);
    const isConstantSelected = selectedNodes.includes(ParameterPropertyNames.IS_CONSTANT);
    const isNonConstantSelected = selectedNodes.includes(ParameterPropertyNames.IS_NON_CONSTANT);
    const isLogarithmicSelected = selectedNodes.includes(ParameterPropertyNames.IS_LOGARITHMIC);
    const isLinearSelected = selectedNodes.includes(ParameterPropertyNames.IS_LINEAR);

    const selectedEnsembleParameters: Parameter[] = [];
    for (const parameter of ensembleParameters.getParameterArr()) {
        // Filter by parameter type
        if (selectedParameterTypes.length > 0 && !selectedParameterTypes.includes(parameter.type)) {
            continue;
        }

        // Filter by parameter name
        if (selectedParameterNames.length > 0 && !selectedParameterNames.includes(parameter.name)) {
            continue;
        }

        // Filter by parameter group
        if (selectedParameterGroups.length !== 0 && parameter.groupName === null) {
            continue;
        }
        if (
            selectedParameterGroups.length !== 0 &&
            parameter.groupName !== null &&
            !selectedParameterGroups.includes(parameter.groupName)
        ) {
            continue;
        }

        // Filter by parameter description
        if (selectedParameterDescriptions.length > 0 && parameter.description === null) {
            continue;
        }
        if (
            selectedParameterDescriptions.length > 0 &&
            parameter.description !== null &&
            !selectedParameterDescriptions.includes(parameter.description)
        ) {
            continue;
        }

        // Filter by parameter is constant/non-constant
        if (isConstantSelected && !parameter.isConstant) {
            continue;
        }
        if (isNonConstantSelected && parameter.isConstant) {
            continue;
        }

        // Filter by parameter is logarithmic/linear
        if (isLogarithmicSelected && parameter.type === ParameterType.CONTINUOUS && !parameter.isLogarithmic) {
            continue;
        }
        if (isLinearSelected && parameter.type === ParameterType.CONTINUOUS && !parameter.isLogarithmic) {
            continue;
        }

        const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);

        // Prevent duplicates
        if (
            selectedEnsembleParameters.some((elm) =>
                ParameterIdent.fromNameAndGroup(elm.name, elm.groupName).equals(parameterIdent)
            )
        ) {
            continue;
        }

        selectedEnsembleParameters.push(parameter);
    }

    return new EnsembleParameters(selectedEnsembleParameters);
}

// Move utils outside/closer to "source"
function fromParameterTypeToString(type: ParameterType): string {
    if (type === ParameterType.CONTINUOUS) {
        return "Continuous";
    }
    if (type === ParameterType.DISCRETE) {
        return "Discrete";
    }
    throw new Error(`Parameter type ${type} not supported`);
}

function fromStringToParameterType(type: string): ParameterType {
    if (type === "Continuous") {
        return ParameterType.CONTINUOUS;
    }
    if (type === "Discrete") {
        return ParameterType.DISCRETE;
    }
    throw new Error(`Parameter string value ${type} not supported`);
}
