import { TreeDataNode } from "@lib/components/SmartNodeSelector";

export function addVectorToVectorSelectorData(
    vectorSelectorData: TreeDataNode[],
    vector: string,
    description?: string,
    descriptionAtLastNode = false
): void {
    const nodes = vector.split(":");
    let currentChildList = vectorSelectorData;

    nodes.forEach((node, index) => {
        let foundNode = false;
        for (const child of currentChildList) {
            if (child.name === node) {
                foundNode = true;
                currentChildList = child.children ?? [];
                break;
            }
        }
        if (!foundNode) {
            const doAddDescription =
                description !== undefined &&
                ((descriptionAtLastNode && index === nodes.length - 1) || (!descriptionAtLastNode && index === 0));

            const nodeData: TreeDataNode = {
                name: node,
                children: index < nodes.length - 1 ? [] : undefined,
                description: doAddDescription ? description : undefined,
            };

            currentChildList.push(nodeData);
            currentChildList = nodeData.children ?? [];
        }
    });
}

export function createVectorSelectorDataFromVectors(vectors: string[]): TreeDataNode[] {
    const vectorSelectorData: TreeDataNode[] = [];

    for (const vector of vectors) {
        addVectorToVectorSelectorData(vectorSelectorData, vector);
    }

    return vectorSelectorData;
}
