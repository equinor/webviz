import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";

import checkIcon from "../private-assets/check.svg";
import segmentIcon from "../private-assets/segment.svg";

export const ParameterParentNodeNames = {
    NAME: "Name",
    GROUP: "Group",
    CONTINUOUS: "Continuous", // For Parameter.type === ParameterType.CONTINUOUS
    DISCRETE: "Discrete", // For Parameter.type === ParameterType.DISCRETE
    IS_CONSTANT: "Constant", // For Parameter.isConstant === true
    IS_NONCONSTANT: "Nonconstant", // For Parameter.isConstant === false
    IS_LOGARITHMIC: "Logarithmic", // For Parameter.isLogarithmic === true
    IS_LINEAR: "Linear", // For Parameter.isLogarithmic === false
};

export function fromParameterTypeToNodeName(type: ParameterType): string {
    if (type === ParameterType.CONTINUOUS) {
        return ParameterParentNodeNames.CONTINUOUS;
    }
    if (type === ParameterType.DISCRETE) {
        return ParameterParentNodeNames.DISCRETE;
    }
    throw new Error(`Parameter type ${type} not supported`);
}

function addParameterToTreeDataNodeList(treeNodeDataList: TreeDataNode[], parameter: Parameter): void {
    const findOrCreateNode = (treeNodeDataList: TreeDataNode[], nodeName: string, icon?: string): TreeDataNode => {
        const existingNode = treeNodeDataList.find((node) => node.name === nodeName);
        if (existingNode) {
            return existingNode;
        }

        const newNode: TreeDataNode = { name: nodeName, description: "", icon: icon };
        treeNodeDataList.push(newNode);
        return newNode;
    };

    // Parameter Name
    const nameParentNode = findOrCreateNode(treeNodeDataList, ParameterParentNodeNames.NAME, segmentIcon);
    if (!nameParentNode.children) {
        nameParentNode.children = [];
    }
    findOrCreateNode(nameParentNode.children, parameter.name);

    // Parameter Group
    if (parameter.groupName) {
        const groupParentNode = findOrCreateNode(treeNodeDataList, ParameterParentNodeNames.GROUP, segmentIcon);
        if (!groupParentNode.children) {
            groupParentNode.children = [];
        }
        findOrCreateNode(groupParentNode.children, parameter.groupName);
    }

    // Parameter is Continuous or Discrete
    const parameterTypeNodeName = fromParameterTypeToNodeName(parameter.type);
    findOrCreateNode(treeNodeDataList, parameterTypeNodeName, checkIcon);

    // Parameter is constant/nonconstant
    findOrCreateNode(treeNodeDataList, ParameterParentNodeNames.IS_CONSTANT, checkIcon);
    findOrCreateNode(treeNodeDataList, ParameterParentNodeNames.IS_NONCONSTANT, checkIcon);

    // Parameter is logarithmic/linear
    if (parameter.type === ParameterType.CONTINUOUS) {
        findOrCreateNode(treeNodeDataList, ParameterParentNodeNames.IS_LOGARITHMIC, checkIcon);
        findOrCreateNode(treeNodeDataList, ParameterParentNodeNames.IS_LINEAR, checkIcon);
    }
}

export function createTreeDataNodeListFromParameters(parameters: Parameter[]): TreeDataNode[] {
    const treeDataNodeList: TreeDataNode[] = [];
    parameters.forEach((parameter) => {
        addParameterToTreeDataNodeList(treeDataNodeList, parameter);
    });

    const spliceNodeIndexAndAddElementToNewList = (nodeIndex: number, newNodeList: TreeDataNode[]): void => {
        const nodeElement = treeDataNodeList.splice(nodeIndex, 1).at(0);
        if (nodeElement) {
            newNodeList.push(nodeElement);
        }
    };

    // Post-processing: Set order of parent nodes
    const sortedParentNodeList: TreeDataNode[] = [];
    const continuousNodeIndex = treeDataNodeList.findIndex((node) => node.name === ParameterParentNodeNames.CONTINUOUS);
    if (continuousNodeIndex !== -1) {
        spliceNodeIndexAndAddElementToNewList(continuousNodeIndex, sortedParentNodeList);
    }
    const discreteNodeIndex = treeDataNodeList.findIndex((node) => node.name === ParameterParentNodeNames.DISCRETE);
    if (discreteNodeIndex !== -1) {
        spliceNodeIndexAndAddElementToNewList(discreteNodeIndex, sortedParentNodeList);
    }
    const isConstantNodeIndex = treeDataNodeList.findIndex(
        (node) => node.name === ParameterParentNodeNames.IS_CONSTANT
    );
    if (isConstantNodeIndex !== -1) {
        spliceNodeIndexAndAddElementToNewList(isConstantNodeIndex, sortedParentNodeList);
    }
    const isNonConstantNodeIndex = treeDataNodeList.findIndex(
        (node) => node.name === ParameterParentNodeNames.IS_NONCONSTANT
    );
    if (isNonConstantNodeIndex !== -1) {
        spliceNodeIndexAndAddElementToNewList(isNonConstantNodeIndex, sortedParentNodeList);
    }
    const isLogarithmicNodeIndex = treeDataNodeList.findIndex(
        (node) => node.name === ParameterParentNodeNames.IS_LOGARITHMIC
    );
    if (isLogarithmicNodeIndex !== -1) {
        spliceNodeIndexAndAddElementToNewList(isLogarithmicNodeIndex, sortedParentNodeList);
    }
    const isLinearNodeIndex = treeDataNodeList.findIndex((node) => node.name === ParameterParentNodeNames.IS_LINEAR);
    if (isLinearNodeIndex !== -1) {
        spliceNodeIndexAndAddElementToNewList(isLinearNodeIndex, sortedParentNodeList);
    }
    const nameNodeIndex = treeDataNodeList.findIndex((node) => node.name === ParameterParentNodeNames.NAME);
    if (nameNodeIndex !== -1) {
        spliceNodeIndexAndAddElementToNewList(nameNodeIndex, sortedParentNodeList);
    }
    const groupNodeIndex = treeDataNodeList.findIndex((node) => node.name === ParameterParentNodeNames.GROUP);
    if (groupNodeIndex !== -1) {
        spliceNodeIndexAndAddElementToNewList(groupNodeIndex, sortedParentNodeList);
    }

    // Add remaining elements after splice
    sortedParentNodeList.push(...treeDataNodeList);
    return sortedParentNodeList;
}

export function getParametersMatchingSelectedNodes(parameters: Parameter[], selectedNodes: string[]): Parameter[] {
    // No selection implies no filtering
    if (selectedNodes.length === 0) {
        return parameters;
    }

    const delimiter = ":";
    const findSelectedParameterPropertiesFromName = (propertyName: string): string[] => {
        return selectedNodes
            .filter((node) => node.split(delimiter, 1)[0] === propertyName)
            .map((node) => node.split(delimiter, 2)[1]);
    };

    // Get parameter property filters
    const selectedParameterNames = findSelectedParameterPropertiesFromName(ParameterParentNodeNames.NAME);
    const selectedParameterGroups = findSelectedParameterPropertiesFromName(ParameterParentNodeNames.GROUP);
    const isContinuousSelected = selectedNodes.includes(ParameterParentNodeNames.CONTINUOUS);
    const isDiscreteSelected = selectedNodes.includes(ParameterParentNodeNames.DISCRETE);
    const isConstantSelected = selectedNodes.includes(ParameterParentNodeNames.IS_CONSTANT);
    const isNonConstantSelected = selectedNodes.includes(ParameterParentNodeNames.IS_NONCONSTANT);
    const isLogarithmicSelected = selectedNodes.includes(ParameterParentNodeNames.IS_LOGARITHMIC);
    const isLinearSelected = selectedNodes.includes(ParameterParentNodeNames.IS_LINEAR);

    const selectedEnsembleParameters: Parameter[] = [];
    for (const parameter of parameters) {
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

        // Intersection filter by parameter type (continuous/discrete)
        if (isContinuousSelected && isDiscreteSelected) continue;
        if (isContinuousSelected && parameter.type !== ParameterType.CONTINUOUS) continue;
        if (isDiscreteSelected && parameter.type !== ParameterType.DISCRETE) continue;

        // Intersection filter by parameter is constant/non-constant
        if (isConstantSelected && isNonConstantSelected) continue;
        if (isConstantSelected && !parameter.isConstant) continue;
        if (isNonConstantSelected && parameter.isConstant) continue;

        // Filter by parameter is logarithmic/linear
        if (isLogarithmicSelected && isLinearSelected) continue;
        if (isLogarithmicSelected && parameter.type === ParameterType.CONTINUOUS && !parameter.isLogarithmic) continue;
        if (isLinearSelected && parameter.type === ParameterType.CONTINUOUS && parameter.isLogarithmic) continue;

        // Prevent duplicates
        const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
        if (
            selectedEnsembleParameters.some((elm) =>
                ParameterIdent.fromNameAndGroup(elm.name, elm.groupName).equals(parameterIdent)
            )
        ) {
            continue;
        }

        selectedEnsembleParameters.push(parameter);
    }

    return selectedEnsembleParameters;
}
