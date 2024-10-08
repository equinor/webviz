import { Parameter, ParameterIdent } from "@framework/EnsembleParameters";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";

import folderIcon from "../private-assets/folder.svg";
import miscIcon from "../private-assets/misc.svg";

const NON_GROUPED_PARENT_NODE = "Generic";

/**
 * Add a parameter node to a tree data node list under a requested group node.
 */
function addParameterNodeToTreeDataNodeList(
    treeDataNodeList: TreeDataNode[],
    parameterNode: TreeDataNode,
    groupNodeName: string
) {
    const groupNode = treeDataNodeList.find((node) => node.id === groupNodeName);

    if (!groupNode) {
        const icon = groupNodeName === NON_GROUPED_PARENT_NODE ? miscIcon : folderIcon;
        const newGroupNode: TreeDataNode = {
            id: groupNodeName,
            name: groupNodeName,
            icon: icon,
            children: [parameterNode],
        };
        treeDataNodeList.push(newGroupNode);
    } else {
        if (!groupNode.children) {
            groupNode.children = [parameterNode];
        } else {
            groupNode.children.push(parameterNode);
        }
    }
}

/**
 * Create a tree data node list for the SmartNodeSelector component form list of parameters.
 *
 * The parent nodes are created based on existing groups.
 * Parameters with no group are added to the parent node with name NON_GROUPED_PARENT_NODE.
 */
export function createTreeDataNodeListFromParameters(
    parameters: readonly Parameter[],
    includeConstantParameters: boolean
): TreeDataNode[] {
    if (parameters.length === 0) {
        return [];
    }

    const validParameters = includeConstantParameters
        ? parameters
        : parameters.filter((parameter) => !parameter.isConstant);

    const treeDataNodeList: TreeDataNode[] = [];
    for (const parameter of validParameters) {
        const parameterIdentString = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName).toString();
        const newNode: TreeDataNode = {
            id: parameterIdentString,
            name: parameter.name,
            // description: parameter.description ?? undefined,
            children: [],
        };

        const parentNodeName = parameter.groupName ?? NON_GROUPED_PARENT_NODE;
        addParameterNodeToTreeDataNodeList(treeDataNodeList, newNode, parentNodeName);
    }

    return treeDataNodeList;
}

/**
 * Create a tree data node list for the SmartNodeSelector component from a list of parameters.
 */
export function createSmartNodeSelectorTagListFromParameterList(parameters: Parameter[]): string[] {
    const tags: string[] = [];

    for (const parameter of parameters) {
        if (!parameter.groupName) {
            tags.push(`${NON_GROUPED_PARENT_NODE}:${parameter.name}`);
        } else {
            tags.push(`${parameter.groupName}:${parameter.name}`);
        }
    }

    return tags;
}

/**
 * Create a tree data node list for the SmartNodeSelector component from a list of parameter ident strings.
 */
export function createSmartNodeSelectorTagListFromParameterIdentStrings(parameterIdentStrings: string[]): string[] {
    const tags: string[] = [];

    for (const parameterIdentString of parameterIdentStrings) {
        const parameterIdent = ParameterIdent.fromString(parameterIdentString);
        if (!parameterIdent.groupName) {
            tags.push(`${NON_GROUPED_PARENT_NODE}:${parameterIdent.name}`);
        } else {
            tags.push(`${parameterIdent.groupName}:${parameterIdent.name}`);
        }
    }

    return tags;
}
