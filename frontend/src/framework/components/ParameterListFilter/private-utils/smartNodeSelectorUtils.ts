import { Parameter, ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";

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

export function createAndAddNode(treeNodeDataList: TreeDataNode[], nodeName: string, icon?: string): TreeDataNode {
    const newNode: TreeDataNode = { name: nodeName, description: "", icon: icon };
    treeNodeDataList.push(newNode);
    return newNode;
}

export function findOrCreateNode(treeNodeDataList: TreeDataNode[], nodeName: string, icon?: string): TreeDataNode {
    const existingNode = treeNodeDataList.find((node) => node.name === nodeName);
    if (existingNode) {
        return existingNode;
    }

    return createAndAddNode(treeNodeDataList, nodeName, icon);
}

export function addParameterNameAndGroupToTreeDataNodeList(
    treeNodeDataList: TreeDataNode[],
    parameter: Parameter,
    icon?: string
): void {
    // Parameter Name
    const nameParentNode = findOrCreateNode(treeNodeDataList, ParameterParentNodeNames.NAME, icon);
    if (!nameParentNode.children) {
        nameParentNode.children = [];
    }
    findOrCreateNode(nameParentNode.children, parameter.name);

    // Parameter Group
    if (parameter.groupName) {
        const groupParentNode = findOrCreateNode(treeNodeDataList, ParameterParentNodeNames.GROUP, icon);
        if (!groupParentNode.children) {
            groupParentNode.children = [];
        }
        findOrCreateNode(groupParentNode.children, parameter.groupName);
    }
}

export function createTreeDataNodeListFromParameters(
    parameters: Parameter[],
    checkIcon?: string,
    parentIcon?: string
): TreeDataNode[] {
    if (parameters.length === 0) {
        return [];
    }

    const treeDataNodeList: TreeDataNode[] = [];

    const hasContinuousParameter = parameters.some((parameter) => parameter.type === ParameterType.CONTINUOUS);

    // Node for boolean/state properties on top level
    createAndAddNode(treeDataNodeList, ParameterParentNodeNames.CONTINUOUS, checkIcon);
    createAndAddNode(treeDataNodeList, ParameterParentNodeNames.DISCRETE, checkIcon);
    createAndAddNode(treeDataNodeList, ParameterParentNodeNames.IS_CONSTANT, checkIcon);
    createAndAddNode(treeDataNodeList, ParameterParentNodeNames.IS_NONCONSTANT, checkIcon);
    if (hasContinuousParameter) {
        createAndAddNode(treeDataNodeList, ParameterParentNodeNames.IS_LOGARITHMIC, checkIcon);
        createAndAddNode(treeDataNodeList, ParameterParentNodeNames.IS_LINEAR, checkIcon);
    }

    // Add name and group for parameters
    for (const parameter of parameters) {
        addParameterNameAndGroupToTreeDataNodeList(treeDataNodeList, parameter, parentIcon);
    }

    return treeDataNodeList;
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

    const isContinuousSelected = selectedNodes.includes(ParameterParentNodeNames.CONTINUOUS);
    const isDiscreteSelected = selectedNodes.includes(ParameterParentNodeNames.DISCRETE);
    const isConstantSelected = selectedNodes.includes(ParameterParentNodeNames.IS_CONSTANT);
    const isNonConstantSelected = selectedNodes.includes(ParameterParentNodeNames.IS_NONCONSTANT);
    const isLogarithmicSelected = selectedNodes.includes(ParameterParentNodeNames.IS_LOGARITHMIC);
    const isLinearSelected = selectedNodes.includes(ParameterParentNodeNames.IS_LINEAR);

    // Intersection filtering, i.e. parameter cannot be both continuous and discrete, constant and non-constant, logarithmic and linear
    if (isContinuousSelected && isDiscreteSelected) return [];
    if (isConstantSelected && isNonConstantSelected) return [];
    if (isLogarithmicSelected && isLinearSelected) return [];

    const selectedParameterNames = findSelectedParameterPropertiesFromName(ParameterParentNodeNames.NAME);
    const selectedParameterGroups = findSelectedParameterPropertiesFromName(ParameterParentNodeNames.GROUP);

    const isNoParameterPropertyAmongSelectedNodes =
        !isContinuousSelected &&
        !isDiscreteSelected &&
        !isConstantSelected &&
        !isNonConstantSelected &&
        !isLogarithmicSelected &&
        !isLinearSelected &&
        selectedParameterNames.length === 0 &&
        selectedParameterGroups.length === 0;
    if (isNoParameterPropertyAmongSelectedNodes) {
        return [];
    }

    const selectedEnsembleParameters: Parameter[] = [];
    for (const parameter of parameters) {
        // Filter by parameter name
        if (selectedParameterNames.length !== 0 && !selectedParameterNames.includes(parameter.name)) {
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
        if (isContinuousSelected && parameter.type !== ParameterType.CONTINUOUS) continue;
        if (isDiscreteSelected && parameter.type !== ParameterType.DISCRETE) continue;

        // Intersection filter by parameter is constant/non-constant
        if (isConstantSelected && !parameter.isConstant) continue;
        if (isNonConstantSelected && parameter.isConstant) continue;

        // Filter by parameter is logarithmic/linear (only for continuous parameters)
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
