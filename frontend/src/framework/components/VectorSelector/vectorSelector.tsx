import React from "react";

import { VectorDefinitionsType, vectorDefinitions } from "@assets/vectorDefinitions";
import {
    Direction,
    KeyEventType,
    SmartNodeSelectorComponent,
    SmartNodeSelectorProps,
    TreeData,
    TreeDataNode,
} from "@lib/components/SmartNodeSelector";

import aquifer from "./private-assets/aquifer.svg";
import block from "./private-assets/block.svg";
import calculated from "./private-assets/calculated.svg";
import field from "./private-assets/field.svg";
import group from "./private-assets/group.svg";
import misc from "./private-assets/misc.svg";
import network from "./private-assets/network.svg";
import others from "./private-assets/others.svg";
import region_region from "./private-assets/region-region.svg";
import region from "./private-assets/region.svg";
import segment from "./private-assets/segment.svg";
import well_completion from "./private-assets/well-completion.svg";
import well from "./private-assets/well.svg";
import { VectorSelection } from "./private-utils/VectorSelection";

export type VectorSelectorProps = SmartNodeSelectorProps & {
    customVectorDefinitions?: VectorDefinitionsType;
};

export type VectorSelectorComponentProps = { [K in keyof VectorSelectorProps]-?: VectorSelectorProps[K] };

export class VectorSelectorComponent extends SmartNodeSelectorComponent {
    props: VectorSelectorComponentProps;
    protected vectorDefinitions: VectorDefinitionsType;

    constructor(props: VectorSelectorComponentProps) {
        super(props);
        this.props = props;

        this.vectorDefinitions = vectorDefinitions;
        if (props.customVectorDefinitions) {
            Object.keys(props.customVectorDefinitions).forEach((vectorName: string) => {
                this.vectorDefinitions[vectorName] = props.customVectorDefinitions[vectorName];
            });
        }

        let error: string | undefined = undefined;
        try {
            this.treeData = new TreeData({
                treeData: this.modifyTreeData(props.data, props.numMetaNodes, this.vectorDefinitions),
                delimiter: props.delimiter,
                allowOrOperator: props.useBetaFeatures || false,
            });
        } catch (e) {
            this.treeData = null;
            error = e as string;
        }

        const nodeSelections: VectorSelection[] = [];
        if (props.selectedTags !== undefined) {
            for (const tag of props.selectedTags) {
                const nodePath = tag.split(this.props.delimiter);
                nodePath.splice(props.numMetaNodes, 0, "*");
                nodeSelections.push(this.createNewNodeSelection(nodePath));
            }
        }
        if (nodeSelections.length < props.maxNumSelectedNodes || props.maxNumSelectedNodes === -1) {
            nodeSelections.push(this.createNewNodeSelection());
        }

        this.state = {
            nodeSelections,
            currentTagIndex: 0,
            suggestionsVisible: false,
            showAllSuggestions: false,
            hasError: error !== undefined,
            error: error || "",
            currentTagShaking: false,
        };
    }

    componentDidUpdate(prevProps: VectorSelectorProps): void {
        if (
            this.props.customVectorDefinitions &&
            JSON.stringify(this.props.customVectorDefinitions) !== JSON.stringify(prevProps.customVectorDefinitions)
        ) {
            this.vectorDefinitions = vectorDefinitions;
            Object.keys(this.props.customVectorDefinitions).forEach((vectorName: string) => {
                this.vectorDefinitions[vectorName] = (this.props.customVectorDefinitions as VectorDefinitionsType)[
                    vectorName
                ];
            });
        }

        if (
            (this.props.data && JSON.stringify(this.props.data) !== JSON.stringify(prevProps.data)) ||
            (this.props.delimiter && this.props.delimiter !== prevProps.delimiter) ||
            (this.props.numMetaNodes && this.props.numMetaNodes !== prevProps.numMetaNodes)
        ) {
            let error: string | undefined;
            try {
                this.treeData = new TreeData({
                    treeData: this.modifyTreeData(this.props.data, this.props.numMetaNodes, this.vectorDefinitions),
                    delimiter: this.props.delimiter,
                    allowOrOperator: this.props.useBetaFeatures || false,
                });
            } catch (e) {
                this.treeData = null;
                error = e as string;
            }
            const nodeSelections: VectorSelection[] = [];
            for (const node of this.state.nodeSelections) {
                nodeSelections.push(this.createNewNodeSelection(node.getNodePath()));
            }

            this.setState(
                {
                    nodeSelections: nodeSelections,
                    currentTagIndex: this.state.currentTagIndex,
                    suggestionsVisible: this.state.suggestionsVisible,
                    hasError: error !== undefined,
                    error: error || "",
                },
                () => {
                    this.updateSelectedTagsAndNodes();
                }
            );
        }

        const selectedTags = this.state.nodeSelections
            .filter((nodeSelection) => nodeSelection.isValid())
            .map((nodeSelection) => nodeSelection.getCompleteNodePathAsString());
        if (
            this.props.selectedTags &&
            JSON.stringify(this.props.selectedTags) !== JSON.stringify(selectedTags) &&
            JSON.stringify(prevProps.selectedTags) !== JSON.stringify(this.props.selectedTags)
        ) {
            const nodeSelections: VectorSelection[] = [];
            if (this.props.selectedTags !== undefined) {
                for (const tag of this.props.selectedTags) {
                    const nodePath = tag.split(this.props.delimiter);
                    nodePath.splice(this.props.numMetaNodes, 0, "*");
                    nodeSelections.push(this.createNewNodeSelection(nodePath));
                }
            }
            if (nodeSelections.length < this.props.maxNumSelectedNodes || this.props.maxNumSelectedNodes === -1) {
                nodeSelections.push(this.createNewNodeSelection());
            }
            this.numValidSelections = this.countValidSelections();
            this.updateState({ nodeSelections: nodeSelections });
        }
    }

    protected createNewNodeSelection(nodePath: string[] = [""]): VectorSelection {
        return new VectorSelection({
            focussedLevel: nodePath.length - 1,
            nodePath: nodePath,
            selected: false,
            delimiter: this.props.delimiter,
            numMetaNodes: this.props.numMetaNodes + 1,
            treeData: this.treeData as TreeData,
            caseInsensitiveMatching: this.props.caseInsensitiveMatching || false,
            allowOrOperator: this.props.useBetaFeatures || false,
        });
    }

    private modifyTreeData(
        treeData: TreeDataNode[],
        numMetaNodes: number,
        vectorDefinitions: VectorDefinitionsType
    ): TreeDataNode[] {
        const typeIcons: Record<string, string> = {
            aquifer: aquifer,
            block: block,
            calculated: calculated,
            field: field,
            group: group,
            misc: misc,
            network: network,
            others: others,
            region: region,
            "region-region": region_region,
            segment: segment,
            well: well,
            "well-completion": well_completion,
        };
        const populateData = (data: TreeDataNode[] | undefined, level: number) => {
            const newData: TreeDataNode[] = [];
            if (level === numMetaNodes && data) {
                const types: Record<string, Array<TreeDataNode>> = {};
                for (let i = 0; i < data.length; i++) {
                    let type = "others";
                    if (data[i].name in vectorDefinitions) {
                        const asKey = data[i].name as keyof typeof vectorDefinitions;
                        type = vectorDefinitions[asKey].type;
                    }
                    if (!(type in types)) {
                        types[type] = [];
                    }

                    if (!data[i].description && data[i].name in vectorDefinitions) {
                        data[i].description = vectorDefinitions[data[i].name].description || "";
                    }

                    types[type].push(data[i]);
                }
                for (const type in types) {
                    newData.push({
                        name: type.charAt(0).toUpperCase() + type.slice(1),
                        description: vectorDefinitions[type] ? vectorDefinitions[type].description : "",
                        icon: typeIcons[type],
                        children: types[type],
                    });
                }
            } else if (data) {
                for (let i = 0; i < data.length; i++) {
                    newData.push({
                        name: data[i].name,
                        description: data[i].description || "",
                        color: data[i].color,
                        children: populateData(data[i].children, level + 1),
                    });
                }
            }
            return newData;
        };

        return populateData(treeData, 0);
    }

    protected handleArrowLeftKeyEvent(e: React.KeyboardEvent<HTMLInputElement>, eventType: KeyEventType): void {
        const eventTarget = e.target as HTMLInputElement;
        if (!eventTarget) {
            return;
        }
        if (eventType === KeyEventType.KeyDown && !e.repeat) {
            if (
                e.shiftKey &&
                eventTarget.selectionStart === 0 &&
                eventTarget.selectionEnd === 0 &&
                this.currentTagIndex() > 0
            ) {
                super.handleArrowLeftKeyEvent(e, eventType);
                return;
            } else {
                if (eventTarget.selectionStart === 0 && eventTarget.selectionEnd === 0) {
                    if (this.currentNodeSelection() && this.currentNodeSelection().getFocussedLevel() === 1) {
                        if (this.currentTagIndex() > 0) {
                            this.decrementCurrentTagIndex(() => {
                                this.focusCurrentTag(Direction.Right);
                            });
                        }
                        e.preventDefault();
                        return;
                    }
                }
            }
        }
        super.handleArrowLeftKeyEvent(e, eventType);
        return;
    }

    protected handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
        super.handleInputChange(e);
        this.noUserInputSelect = true;
    }
}

export const VectorSelector: React.FC<VectorSelectorProps> = (props) => {
    const adjustedProps: VectorSelectorComponentProps = {
        id: props.id ?? "",
        data: props.data,
        customVectorDefinitions: props.customVectorDefinitions ?? {},
        onChange:
            props.onChange ??
            (() => {
                return;
            }),
        label: props.label ?? "",
        maxNumSelectedNodes: props.maxNumSelectedNodes ?? -1,
        delimiter: props.delimiter ?? ":",
        numMetaNodes: props.numMetaNodes ?? 0,
        showSuggestions: props.showSuggestions ?? true,
        selectedTags: props.selectedTags ?? [],
        placeholder: props.placeholder ?? "Add new tag...",
        numSecondsUntilSuggestionsAreShown: props.numSecondsUntilSuggestionsAreShown ?? 0.5,
        lineBreakAfterTag: props.lineBreakAfterTag ?? false,
        caseInsensitiveMatching: props.caseInsensitiveMatching ?? false,
        useBetaFeatures: props.useBetaFeatures ?? false,
    };

    return <VectorSelectorComponent {...adjustedProps} />;
};

/**
 * Add vector to existing vector selector data tree node list.
 * With optional description at first or last node level.
 */
export function addVectorToVectorSelectorData(
    vectorSelectorData: TreeDataNode[],
    vector: string,
    delimiter = ":",
    description?: string,
    descriptionAtLastNode = false
): void {
    const nodes = vector.split(delimiter);
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

            const _children = index < nodes.length - 1 ? [] : undefined;
            const nodeData: TreeDataNode = doAddDescription
                ? {
                      name: node,
                      children: _children,
                      description: description,
                  }
                : { name: node, children: _children };

            currentChildList.push(nodeData);
            currentChildList = nodeData.children ?? [];
        }
    });
}

/**
 * Create vector selector data tree node list from list of vector names
 *
 * This method sorts the vector names alphabetically before adding them to the tree data.
 *
 * The method assumes most vectors only has one node level, i.e. one occurrence of the delimiter.
 * Thereby the inner recursive node creation loop is not optimized for vectors with many node levels.
 */
export function createVectorSelectorDataFromVectors(vectors: string[], delimiter = ":"): TreeDataNode[] {
    if (vectors.length === 0) return [];

    const vectorSelectorData: TreeDataNode[] = [];

    // Sort alphabetically - to place vectors with same parent node next to each other
    const sortedVectors = [...vectors].sort();

    // Add vectors with same parent node simultaneously
    for (let i = 0; i < sortedVectors.length; ) {
        const parentNode = sortedVectors[i].split(delimiter)[0];

        // Find the index of the first vector with a different parent node
        const endIndex = sortedVectors.findIndex((vector, j) => j >= i && vector.split(delimiter)[0] !== parentNode);

        // endIndex will be the index of the first vector with a different parent node
        const vectorsWithSameParentNode: string[] = sortedVectors.slice(i, endIndex !== -1 ? endIndex : undefined);

        const parentNodeData: TreeDataNode = {
            name: parentNode,
        };
        parentNodeData.children = [];
        vectorSelectorData.push(parentNodeData);

        // Add each vector recursively
        for (const vector of vectorsWithSameParentNode) {
            let currentChildList = parentNodeData.children;
            const nodes = vector.split(delimiter).slice(1);

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
                    const nodeData: TreeDataNode = {
                        name: node,
                        children: index < nodes.length - 1 ? [] : undefined,
                    };

                    currentChildList.push(nodeData);
                    currentChildList = nodeData.children ?? [];
                }
            });
        }

        // Move to the next parent node
        i = endIndex !== -1 ? endIndex : sortedVectors.length;
    }

    return vectorSelectorData;
}
