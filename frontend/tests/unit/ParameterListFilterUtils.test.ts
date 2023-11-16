import { ContinuousParameter, DiscreteParameter, ParameterType } from "@framework/EnsembleParameters";
import {
    createAndAddNode,
    createTreeDataNodeListFromParameters,
    getChildNodeNamesFromParentNodeName,
    getParametersMatchingSelectedNodes,
} from "@framework/components/ParameterListFilter/private-utils/smartNodeSelectorUtils";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";

import { describe, expect, test } from "vitest";

const CONTINUOUS_PARAMETER: ContinuousParameter = {
    type: ParameterType.CONTINUOUS,
    name: "continuous parameter",
    groupName: "group1",
    description: "continuous parameter description",
    isConstant: false,
    isLogarithmic: false,
    realizations: [1, 2, 3],
    values: [10, 11, 12],
};

const SECOND_CONTINUOUS_PARAMETER: ContinuousParameter = {
    type: ParameterType.CONTINUOUS,
    name: "second continuous parameter",
    groupName: "group1",
    description: "continuous parameter description 2",
    isConstant: true,
    isLogarithmic: false,
    realizations: [1, 2, 3],
    values: [10, 11, 12],
};

const DISCRETE_PARAMETER: DiscreteParameter = {
    type: ParameterType.DISCRETE,
    name: "discrete parameter",
    groupName: "group2",
    description: "discrete parameter description",
    isConstant: true,
    realizations: [1, 2, 3],
    values: [10, 11, 12],
};

describe("Test of utility functions for ParameterListFilter", () => {
    test("Test create and add node", () => {
        const myTestList: TreeDataNode[] = [];
        const newNode = createAndAddNode(myTestList, "my node");
        expect(newNode.name).toBe("my node");
        expect(newNode.name).toBe(myTestList[0].name);
    });

    test("Create tree data node list from parameters", () => {
        const parameterList = [CONTINUOUS_PARAMETER, DISCRETE_PARAMETER];
        const testNodes = createTreeDataNodeListFromParameters(parameterList);

        expect(testNodes.length).toBe(8);
        expect(testNodes[0].name).toBe("Continuous");
        expect(testNodes[0].children).toBe(undefined);
        expect(testNodes[1].name).toBe("Discrete");
        expect(testNodes[1].children).toBe(undefined);
        expect(testNodes[2].name).toBe("Constant");
        expect(testNodes[2].children).toBe(undefined);
        expect(testNodes[3].name).toBe("Nonconstant");
        expect(testNodes[3].children).toBe(undefined);
        expect(testNodes[4].name).toBe("Logarithmic");
        expect(testNodes[4].children).toBe(undefined);
        expect(testNodes[5].name).toBe("Linear");
        expect(testNodes[5].children).toBe(undefined);
        expect(testNodes[6].name).toBe("Name");
        expect(testNodes[6].children?.length).toBe(2);
        expect(testNodes[6].children?.[0].name).toBe("continuous parameter");
        expect(testNodes[6].children?.[1].name).toBe("discrete parameter");
        expect(testNodes[7].name).toBe("Group");
        expect(testNodes[7].children?.length).toBe(2);
        expect(testNodes[7].children?.[0].name).toBe("group1");
        expect(testNodes[7].children?.[1].name).toBe("group2");
    });

    test("Get parameters matching selected nodes - invalid/conflicting", () => {
        const parameterList = [CONTINUOUS_PARAMETER, DISCRETE_PARAMETER];

        const invalidNodes = ["Invalid node"];
        expect(getParametersMatchingSelectedNodes(parameterList, invalidNodes)).toEqual([]);
        const conflictingNodes = ["Continuous", "Discrete"];
        expect(getParametersMatchingSelectedNodes(parameterList, conflictingNodes)).toEqual([]);
    });

    test("Get parameters matching selected nodes - valid", () => {
        const parameterList = [CONTINUOUS_PARAMETER, DISCRETE_PARAMETER];

        expect(getParametersMatchingSelectedNodes(parameterList, ["Group:group1"])).toEqual([CONTINUOUS_PARAMETER]);
        expect(getParametersMatchingSelectedNodes(parameterList, ["Name:discrete parameter"])).toEqual([
            DISCRETE_PARAMETER,
        ]);
    });

    test("Get parameters matching selected nodes - non-default delimiter", () => {
        const parameterList = [CONTINUOUS_PARAMETER, DISCRETE_PARAMETER];
        const nonDefaultDelimiter = "/";

        expect(getParametersMatchingSelectedNodes(parameterList, ["Group/group1"], nonDefaultDelimiter)).toEqual([
            CONTINUOUS_PARAMETER,
        ]);
        expect(
            getParametersMatchingSelectedNodes(parameterList, ["Name/discrete parameter"], nonDefaultDelimiter)
        ).toEqual([DISCRETE_PARAMETER]);
    });

    test("Get parameters matching selected nodes - multiple matches", () => {
        const parameterList = [CONTINUOUS_PARAMETER, SECOND_CONTINUOUS_PARAMETER, DISCRETE_PARAMETER];

        expect(getParametersMatchingSelectedNodes(parameterList, ["Group:group1"])).toEqual([
            CONTINUOUS_PARAMETER,
            SECOND_CONTINUOUS_PARAMETER,
        ]);
        expect(getParametersMatchingSelectedNodes(parameterList, ["Constant"])).toEqual([
            SECOND_CONTINUOUS_PARAMETER,
            DISCRETE_PARAMETER,
        ]);
    });

    test("Get parameters matching selected nodes - multiple selected nodes", () => {
        const parameterList = [CONTINUOUS_PARAMETER, SECOND_CONTINUOUS_PARAMETER, DISCRETE_PARAMETER];

        expect(getParametersMatchingSelectedNodes(parameterList, ["Group:group1", "Constant"])).toEqual([
            SECOND_CONTINUOUS_PARAMETER,
        ]);
        expect(getParametersMatchingSelectedNodes(parameterList, ["Invalid Node", "Discrete"])).toEqual([
            DISCRETE_PARAMETER,
        ]);
    });

    test("Get child node names from parent node name", () => {
        const testNodes = ["Name:name1", "Name:name2", "Group:group1", "Group:group2"];

        expect(getChildNodeNamesFromParentNodeName(testNodes, "Name")).toEqual(["name1", "name2"]);
        expect(getChildNodeNamesFromParentNodeName(testNodes, "Group")).toEqual(["group1", "group2"]);
        expect(getChildNodeNamesFromParentNodeName(testNodes, "Invalid Node")).toEqual([]);
    });

    test("Get child node names from parent node name - non-default delimiter", () => {
        const testNodes = ["Name@name1", "Name@name2", "Group@group1", "Group@group2"];
        const nonDefaultDelimiter = "@";

        expect(getChildNodeNamesFromParentNodeName(testNodes, "Name", nonDefaultDelimiter)).toEqual(["name1", "name2"]);
        expect(getChildNodeNamesFromParentNodeName(testNodes, "Group", nonDefaultDelimiter)).toEqual([
            "group1",
            "group2",
        ]);
        expect(getChildNodeNamesFromParentNodeName(testNodes, "Invalid Node", nonDefaultDelimiter)).toEqual([]);
    });
});
