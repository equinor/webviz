import { describe, expect, test } from "vitest";

import type { Parameter } from "@framework/EnsembleParameters";
import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import type { TreeDataNode } from "@lib/components/SmartNodeSelector";
import folderIcon from "src/framework/internal/components/EnsembleRealizationFilter/private-assets/folder.svg";
import miscIcon from "src/framework/internal/components/EnsembleRealizationFilter/private-assets/misc.svg";
import {
    addParameterNodeToTreeDataNodeList,
    createSmartNodeSelectorTagListFromParameterList,
    createSmartNodeSelectorTagTextFromParameterIdentString,
    createSmartNodeSelectorTagTextListFromParameterIdentStrings,
    createTreeDataNodeListFromParameters,
} from "src/framework/internal/components/EnsembleRealizationFilter/private-utils/smartNodeSelectorUtils";

describe("createSmartNodeSelectorTagListFromParameterList", () => {
    const param1: Parameter = {
        type: ParameterType.CONTINUOUS,
        name: "param1",
        groupName: "group1",
        description: null,
        isConstant: false,
        isLogarithmic: false,
        realizations: [],
        values: [],
    };

    const param2: Parameter = {
        type: ParameterType.CONTINUOUS,
        name: "param2",
        groupName: "group2",
        description: null,
        isConstant: false,
        isLogarithmic: false,
        realizations: [],
        values: [],
    };

    const paramNullGroup: Parameter = {
        type: ParameterType.CONTINUOUS,
        name: "param3",
        groupName: null,
        description: null,
        isConstant: false,
        isLogarithmic: false,
        realizations: [],
        values: [],
    };

    test("should return an empty array when given an empty parameter list", () => {
        const parameters: Parameter[] = [];
        const result = createSmartNodeSelectorTagListFromParameterList(parameters);
        expect(result).toEqual([]);
    });

    test("should return tags with NON_GROUPED_PARENT_NODE for parameters without groupName", () => {
        const parameters: Parameter[] = [paramNullGroup];
        const result = createSmartNodeSelectorTagListFromParameterList(parameters);
        expect(result).toEqual(["Generic:param3"]);
    });

    test("should return tags with groupName for parameters with groupName", () => {
        const parameters: Parameter[] = [param1, param2];
        const result = createSmartNodeSelectorTagListFromParameterList(parameters);
        expect(result).toEqual(["group1:param1", "group2:param2"]);
    });

    test("should handle a mix of parameters with and without groupName", () => {
        const parameters: Parameter[] = [param1, paramNullGroup, param2];
        const result = createSmartNodeSelectorTagListFromParameterList(parameters);
        expect(result).toEqual(["group1:param1", "Generic:param3", "group2:param2"]);
    });
});

describe("createSmartNodeSelectorTagTextFromParameterIdentString", () => {
    test("should return the correct tag text for a parameter with a group name", () => {
        const groupName = "groupName";
        const name = "parameterName";
        const parameterIdent = new ParameterIdent(name, groupName);
        const result = createSmartNodeSelectorTagTextFromParameterIdentString(parameterIdent.toString());

        expect(result).toBe("groupName:parameterName");
    });
    test("should return the correct tag text for a parameter without a group name", () => {
        const groupName = null;
        const name = "parameterName";
        const parameterIdent = new ParameterIdent(name, groupName);
        const result = createSmartNodeSelectorTagTextFromParameterIdentString(parameterIdent.toString());
        expect(result).toBe("Generic:parameterName");
    });
});

describe("createSmartNodeSelectorTagTextListFromParameterIdentStrings", () => {
    test("should return an empty array when given an empty array", () => {
        const result = createSmartNodeSelectorTagTextListFromParameterIdentStrings([]);
        expect(result).toEqual([]);
    });

    test("should correctly convert parameter ident strings to tag texts", () => {
        const parameterIdentStrings = [
            ParameterIdent.fromNameAndGroup("param1", "group1").toString(),
            ParameterIdent.fromNameAndGroup("param2", "group2").toString(),
            ParameterIdent.fromNameAndGroup("param3", null).toString(),
        ];

        const result = createSmartNodeSelectorTagTextListFromParameterIdentStrings(parameterIdentStrings);

        expect(result).toEqual(["group1:param1", "group2:param2", "Generic:param3"]);
    });

    test("should handle parameters with no group name", () => {
        const parameterIdentStrings = [
            ParameterIdent.fromNameAndGroup("param1", null).toString(),
            ParameterIdent.fromNameAndGroup("param2", null).toString(),
        ];

        const result = createSmartNodeSelectorTagTextListFromParameterIdentStrings(parameterIdentStrings);

        expect(result).toEqual(["Generic:param1", "Generic:param2"]);
    });

    test("should handle parameters with empty group name", () => {
        const parameterIdentStrings = [
            ParameterIdent.fromNameAndGroup("param1", "").toString(),
            ParameterIdent.fromNameAndGroup("param2", "").toString(),
        ];

        const result = createSmartNodeSelectorTagTextListFromParameterIdentStrings(parameterIdentStrings);

        expect(result).toEqual(["Generic:param1", "Generic:param2"]);
    });
});

const NON_GROUPED_PARENT_NODE = "Generic";

describe("addParameterNodeToTreeDataNodeList", () => {
    test("should add a new group node if it does not exist", () => {
        const treeDataNodeList: TreeDataNode[] = [];
        const parameterNode: TreeDataNode = { id: "param1", name: "Parameter 1", children: [] };
        const groupNodeName = "Group 1";

        addParameterNodeToTreeDataNodeList(treeDataNodeList, parameterNode, groupNodeName);

        expect(treeDataNodeList).toHaveLength(1);
        expect(treeDataNodeList[0]).toEqual({
            id: groupNodeName,
            name: groupNodeName,
            icon: folderIcon,
            children: [parameterNode],
        });
    });

    test("should add a new group node with misc icon if group name is NON_GROUPED_PARENT_NODE", () => {
        const treeDataNodeList: TreeDataNode[] = [];
        const parameterNode: TreeDataNode = { id: "param1", name: "Parameter 1", children: [] };
        const groupNodeName = NON_GROUPED_PARENT_NODE;

        addParameterNodeToTreeDataNodeList(treeDataNodeList, parameterNode, groupNodeName);

        expect(treeDataNodeList).toHaveLength(1);
        expect(treeDataNodeList[0]).toEqual({
            id: groupNodeName,
            name: groupNodeName,
            icon: miscIcon,
            children: [parameterNode],
        });
    });

    test("should add parameter node to existing group node", () => {
        const parameterNode: TreeDataNode = { id: "param1", name: "Parameter 1", children: [] };
        const groupNodeName = "Group 1";
        const treeDataNodeList: TreeDataNode[] = [
            { id: groupNodeName, name: groupNodeName, icon: folderIcon, children: [] },
        ];

        addParameterNodeToTreeDataNodeList(treeDataNodeList, parameterNode, groupNodeName);

        expect(treeDataNodeList).toHaveLength(1);
        expect(treeDataNodeList[0].children).toBeDefined();
        expect(treeDataNodeList[0].children).toHaveLength(1);
        expect(treeDataNodeList[0].children![0]).toEqual(parameterNode);
    });

    test("should create children array if it does not exist in the group node", () => {
        const parameterNode: TreeDataNode = { id: "param1", name: "Parameter 1", children: [] };
        const groupNodeName = "Group 1";
        const treeDataNodeList: TreeDataNode[] = [
            { id: groupNodeName, name: groupNodeName, icon: folderIcon, children: undefined },
        ];

        addParameterNodeToTreeDataNodeList(treeDataNodeList, parameterNode, groupNodeName);

        expect(treeDataNodeList).toHaveLength(1);
        expect(treeDataNodeList[0].children).toBeDefined();
        expect(treeDataNodeList[0].children).toHaveLength(1);
        expect(treeDataNodeList[0].children![0]).toEqual(parameterNode);
    });
});

describe("createTreeDataNodeListFromParameters", () => {
    const baseParameter: Parameter = {
        type: ParameterType.CONTINUOUS,
        name: "param1",
        groupName: "Group 1",
        description: "desc",
        isConstant: false,
        isLogarithmic: false,
        realizations: [],
        values: [],
    };

    const group1ConstantParameter: Parameter = {
        ...baseParameter,
        name: "constantParam",
        isConstant: true,
        description: "constant desc",
    };
    const group1NonConstantParameter: Parameter = {
        ...baseParameter,
        name: "nonConstantParam",
        isConstant: false,
        description: "non constant desc",
    };
    const nullGroupConstantParameter: Parameter = {
        ...baseParameter,
        groupName: null,
        name: "nullGroupParam",
        isConstant: true,
        description: "null group param desc",
    };

    test("should return an empty array if no parameters are provided", () => {
        const parameters: Parameter[] = [];
        const result = createTreeDataNodeListFromParameters(parameters, true, true);
        expect(result).toEqual([]);
    });

    test("should include constant parameters if includeConstantParameters is true", () => {
        const parameters: Parameter[] = [group1ConstantParameter, group1NonConstantParameter];
        const result = createTreeDataNodeListFromParameters(parameters, true, true);

        expect(result).toHaveLength(1);
        expect(result[0].children).toBeDefined();
        expect(result[0].children).toHaveLength(2);
        expect(result[0].children![0]).toEqual({
            id: ParameterIdent.fromNameAndGroup("constantParam", "Group 1").toString(),
            name: "constantParam",
            description: "constant desc",
            children: [],
        });
        expect(result[0].children![1]).toEqual({
            id: ParameterIdent.fromNameAndGroup("nonConstantParam", "Group 1").toString(),
            name: "nonConstantParam",
            description: "non constant desc",
            children: [],
        });
    });

    test("should exclude constant parameters if includeConstantParameters is false", () => {
        const parameters: Parameter[] = [group1ConstantParameter, group1NonConstantParameter];
        const result = createTreeDataNodeListFromParameters(parameters, false, true);

        expect(result).toHaveLength(1);
        expect(result[0].children).toBeDefined();
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children![0]).toEqual({
            id: ParameterIdent.fromNameAndGroup("nonConstantParam", "Group 1").toString(),
            name: "nonConstantParam",
            description: "non constant desc",
            children: [],
        });
    });

    test("should include description if includeNodeDescription is true", () => {
        const parameters: Parameter[] = [group1NonConstantParameter];
        const result = createTreeDataNodeListFromParameters(parameters, true, true);

        expect(result).toHaveLength(1);
        expect(result[0].children).toBeDefined();
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children![0].description).toBeDefined();
        expect(result[0].children![0].description).toEqual("non constant desc");
    });

    test("should not include description if includeNodeDescription is false", () => {
        const parameters: Parameter[] = [group1NonConstantParameter];
        const result = createTreeDataNodeListFromParameters(parameters, true, false);

        expect(result).toHaveLength(1);
        expect(result[0].children).toBeDefined();
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children![0].description).toBeUndefined();
    });

    test("should add parameters with no group to NON_GROUPED_PARENT_NODE", () => {
        const parameters: Parameter[] = [nullGroupConstantParameter];
        const result = createTreeDataNodeListFromParameters(parameters, true, true);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe(NON_GROUPED_PARENT_NODE);
        expect(result[0].name).toBe(NON_GROUPED_PARENT_NODE);
        expect(result[0].children).toBeDefined();
        expect(result[0].children).toHaveLength(1);
        expect(result[0].children![0]).toEqual({
            id: "nullGroupParam",
            name: "nullGroupParam",
            description: "null group param desc",
            children: [],
        });
    });
});
