import {
    addVectorToVectorSelectorData,
    createVectorSelectorDataFromVectors,
} from "@framework/components/VectorSelector";
import { TreeDataNode } from "@lib/components/SmartNodeSelector";

import { describe, expect, test } from "vitest";

const VECTOR_NAMES = ["WOPR:A1", "WOPR:A2", "FOPT", "FGIP", "GGOR:OP", "GGOR:WI", "RGIP:1", "RGIP:2"];
const EXPECTED_VECTOR_SELECTOR_DATA: TreeDataNode[] = [
    { name: "FGIP", children: [] },
    { name: "FOPT", children: [] },
    {
        name: "GGOR",
        children: [
            { name: "OP", children: undefined },
            { name: "WI", children: undefined },
        ],
    },
    {
        name: "RGIP",
        children: [
            { name: "1", children: undefined },
            { name: "2", children: undefined },
        ],
    },
    {
        name: "WOPR",
        children: [
            { name: "A1", children: undefined },
            { name: "A2", children: undefined },
        ],
    },
];

describe("Test of utility functions for VectorSelector component", () => {
    test("Create vector selector data from vectors", () => {
        expect(createVectorSelectorDataFromVectors(VECTOR_NAMES)).toEqual(EXPECTED_VECTOR_SELECTOR_DATA);
    });

    test("Create vector selector data from vectors with empty vector names", () => {
        expect(createVectorSelectorDataFromVectors([])).toEqual([]);
    });

    test("Add vector to existing parent node in vector selector data", () => {
        const vectorSelectorData = createVectorSelectorDataFromVectors(VECTOR_NAMES);
        addVectorToVectorSelectorData(vectorSelectorData, "WOPR:ADDITIONAL_WELL");
        expect(vectorSelectorData).toEqual([
            { name: "FGIP", children: [] },
            { name: "FOPT", children: [] },
            {
                name: "GGOR",
                children: [
                    { name: "OP", children: undefined },
                    { name: "WI", children: undefined },
                ],
            },
            {
                name: "RGIP",
                children: [
                    { name: "1", children: undefined },
                    { name: "2", children: undefined },
                ],
            },
            {
                name: "WOPR",
                children: [
                    { name: "A1", children: undefined },
                    { name: "A2", children: undefined },
                    { name: "ADDITIONAL_WELL", children: undefined },
                ],
            },
        ]);
    });

    test("Add vector to non-existing parent node in vector selector data", () => {
        const vectorSelectorData = createVectorSelectorDataFromVectors(VECTOR_NAMES);
        addVectorToVectorSelectorData(vectorSelectorData, "NEW_PARENT:ADDITIONAL_WELL");
        expect(vectorSelectorData).toEqual([
            { name: "FGIP", children: [] },
            { name: "FOPT", children: [] },
            {
                name: "GGOR",
                children: [
                    { name: "OP", children: undefined },
                    { name: "WI", children: undefined },
                ],
            },
            {
                name: "RGIP",
                children: [
                    { name: "1", children: undefined },
                    { name: "2", children: undefined },
                ],
            },
            {
                name: "WOPR",
                children: [
                    { name: "A1", children: undefined },
                    { name: "A2", children: undefined },
                ],
            },
            {
                name: "NEW_PARENT",
                children: [{ name: "ADDITIONAL_WELL", children: undefined }],
            },
        ]);
    });
});
