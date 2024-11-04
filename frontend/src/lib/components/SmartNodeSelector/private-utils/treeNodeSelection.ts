import React from "react";

import { MatchType, TreeData } from "./treeData";
import { TreeDataNodeMetaData } from "./treeDataNodeTypes";

export class TreeNodeSelection {
    private _focussedLevel: number;
    private _nodePath: Array<string>;
    private _ref: React.RefObject<HTMLInputElement>;
    private _selected: boolean;
    protected delimiter: string;
    private _treeData: TreeData;
    private _numMetaNodes: number;
    private _objectIdentifier: number;
    protected caseInsensitiveMatching: boolean;
    protected allowOrOperator: boolean;
    protected orOperator: string;

    constructor({
        focussedLevel = 0,
        nodePath = [""],
        selected = false,
        delimiter = ":",
        numMetaNodes = 0,
        treeData,
        caseInsensitiveMatching = false,
        allowOrOperator = false,
    }: {
        focussedLevel: number;
        nodePath: Array<string>;
        selected: boolean;
        delimiter: string;
        numMetaNodes: number;
        treeData: TreeData;
        caseInsensitiveMatching: boolean;
        allowOrOperator: boolean;
    }) {
        this._focussedLevel = focussedLevel;
        this._nodePath = nodePath;
        this._selected = selected;
        this._ref = React.createRef<HTMLInputElement>();
        this._treeData = treeData;
        this.delimiter = delimiter;
        this._numMetaNodes = numMetaNodes;
        this._objectIdentifier = Date.now();
        this.caseInsensitiveMatching = caseInsensitiveMatching;
        this.allowOrOperator = allowOrOperator;
        this.orOperator = "|";
    }

    objectEquals(other: TreeNodeSelection): boolean {
        return other._objectIdentifier == this._objectIdentifier;
    }

    getDelimiter(): string {
        return this.delimiter;
    }

    getNodePath(untilLevel?: number): Array<string> {
        if (untilLevel === undefined) {
            return this._nodePath;
        }
        if (untilLevel >= 0 && untilLevel < this.countLevel()) {
            const nodePath: string[] = [];
            for (let i = 0; i <= untilLevel; i++) {
                nodePath.push(this._nodePath[i]);
            }
            return nodePath;
        }
        return [];
    }

    getFocussedNodeName(): string {
        return this._nodePath[this._focussedLevel];
    }

    getNodeName(level: number): string | null {
        if (level >= 0 && level < this.countLevel()) return this._nodePath[level];
        else return null;
    }

    setNodeName(data: string, index?: number): void {
        const adjustedIndex = index || this._focussedLevel;
        this._nodePath[adjustedIndex] = data;
    }

    getId(): string | undefined {
        const node = this.getNodeMetaData(this.getNodePath() as string[]);
        if (node) {
            return node.id;
        }
        return undefined;
    }

    getNodeMetaData(nodePath: Array<string>): TreeDataNodeMetaData | null {
        const nodes = this._treeData.findFirstNode(nodePath);
        if (nodes === null) {
            return null;
        }
        return nodes[nodes.length - 1];
    }

    setNodePath(nodePath: Array<string>): void {
        this._nodePath = nodePath;
    }

    getRef(): React.Ref<HTMLInputElement> {
        return this._ref;
    }

    getFocussedLevel(): number {
        return this._focussedLevel;
    }

    getNumMetaNodes(): number {
        return this._numMetaNodes;
    }

    setFocussedLevel(index: number, includeMetaData = true): void {
        if (!includeMetaData && this._focussedLevel >= this._numMetaNodes) {
            this._focussedLevel = index + this._numMetaNodes;
        } else {
            this._focussedLevel = index;
        }
        this.tidy();
    }

    incrementFocussedLevel(): boolean {
        if (this.caseInsensitiveMatching) {
            this._nodePath[this._focussedLevel] = this._treeData.findNode(this.getNodePath(this._focussedLevel));
        }
        if (this._focussedLevel < this.countLevel() - 1) {
            this._focussedLevel++;
            return true;
        } else if (this.hasAvailableChildNodesOnNextLevel()) {
            this._focussedLevel++;
            this._nodePath[this._focussedLevel] = "";
            return true;
        } else if (this.containsWildcard() && this._treeData.findChildNodes(this._nodePath).length > 0) {
            this._focussedLevel++;
            this._nodePath[this._focussedLevel] = "";
            return true;
        }
        return false;
    }

    decrementFocussedLevel(): void {
        this._focussedLevel--;
        this.tidy();
    }

    isSelected(): boolean {
        return this._selected;
    }

    setSelected(select: boolean): void {
        this._selected = select;
    }

    countLevel(): number {
        return this._nodePath.length;
    }

    colors(): Array<string> {
        const colors: string[] = [];
        if (this._focussedLevel == 0) {
            return [];
        }
        const level = this.countLevel() - 1;
        const allMetaData = this._treeData.findNodes(this.getNodePath(level), MatchType.partialMatch).metaData;
        for (const metaData of allMetaData) {
            for (let i = 0; i < metaData.length; i++) {
                if (i >= this._numMetaNodes) {
                    break;
                }
                const color = metaData[i].color;
                if (color && !colors.some((el) => el === color)) {
                    colors.push(color);
                }
            }
        }
        return colors;
    }

    icons(): Array<string> {
        const icons: string[] = [];
        if (this._focussedLevel === 0) {
            return [];
        }
        const level = this.countLevel() - 1;
        const allMetaData = this._treeData.findNodes(this.getNodePath(level), MatchType.partialMatch).metaData;
        for (const metaData of allMetaData) {
            for (let i = 0; i < metaData.length; i++) {
                if (i >= this._numMetaNodes) {
                    break;
                }
                const icon = metaData[i].icon;
                if (icon && !icons.some((el) => el === icon)) {
                    icons.push(icon);
                }
            }
        }
        return icons;
    }

    equals(other: TreeNodeSelection): boolean {
        return JSON.stringify(this.getNodePath()) == JSON.stringify(other.getNodePath());
    }

    trulyEquals(other: TreeNodeSelection): boolean {
        let check = this.equals(other);
        check = check && this._selected == other.isSelected();
        check = check && this._focussedLevel == other.getFocussedLevel();
        return check;
    }

    containsOrIsContainedBy(other: TreeNodeSelection): boolean {
        if (this.containsWildcard() && !other.containsWildcard()) {
            return this.exactlyMatchedNodePaths().includes(other.getCompleteNodePathAsString());
        } else if (!this.containsWildcard() && other.containsWildcard()) {
            return other.exactlyMatchedNodePaths().includes(this.getCompleteNodePathAsString());
        } else if (this.containsWildcard() && other.containsWildcard()) {
            const otherMatchedTags = other.exactlyMatchedNodePaths();
            return this.exactlyMatchedNodePaths().some((el) => otherMatchedTags.includes(el));
        } else {
            return this.equals(other);
        }
    }

    isFocusOnMetaData(): boolean {
        return this._focussedLevel < this._numMetaNodes;
    }

    displayText(): string {
        if (this.getFocussedLevel() < this._numMetaNodes) {
            return this.getFocussedNodeName();
        } else {
            let text = "";
            for (let i = 0; i < this.countLevel(); i++) {
                const el = this.getNodeName(i);
                if (this.getFocussedLevel() === i && i < this._numMetaNodes && typeof el === "string") {
                    text = el;
                    break;
                } else if (i >= this._numMetaNodes) {
                    if (el === "" && this.getFocussedLevel() < i) break;
                    text += i <= this._numMetaNodes ? el : this.delimiter + el;
                }
            }
            return text;
        }
    }

    getCompleteNodePathAsString(): string {
        return (this.getNodePath() as Array<string>).join(this.delimiter);
    }

    isComplete(): boolean {
        return this.numberOfExactlyMatchedNodes() > 0 || !this.hasAvailableChildNodes();
    }

    displayAsTag(): boolean {
        return this.getFocussedLevel() > 0 || (this._numMetaNodes == 0 && this.countLevel() > 1);
    }

    isEmpty(): boolean {
        return !this.displayAsTag() && this.getFocussedNodeName() == "";
    }

    isValidUpToFocussedNode(): boolean {
        return (
            this.getNodeName(this._focussedLevel) !== "" &&
            this._treeData.findFirstNode(this.getNodePath(this._focussedLevel), false) !== null
        );
    }

    protected tidy(): void {
        const newData: string[] = [];
        for (let i = 0; i < this.countLevel(); i++) {
            if (i > this.getFocussedLevel() && this.getNodeName(i) === "") {
                break;
            }
            newData[i] = this.getNodeName(i) as string;
        }
        this.setNodePath(newData);
    }

    isValid(): boolean {
        if (this._nodePath.length === 0) {
            return false;
        }
        return this._treeData.findFirstNode(this._nodePath) !== null;
    }

    numberOfPossiblyMatchedNodes(): number {
        return this._treeData.countMatchedNodes(this._nodePath);
    }

    numberOfExactlyMatchedNodes(): number {
        return this._treeData.countMatchedNodes(this._nodePath, true);
    }

    exactlyMatchedNodePaths(): Array<string> {
        return this._treeData.findNodes(this._nodePath, MatchType.fullMatch).nodePaths;
    }

    exactlyMatchedNodeIds(): (string | undefined)[][] {
        return this._treeData
            .findNodes(this._nodePath, MatchType.fullMatch)
            .metaData.map((el) => el.map((meta) => meta.id));
    }

    countExactlyMatchedNodePaths(): number {
        return this.exactlyMatchedNodePaths().length;
    }

    hasAvailableChildNodesOnNextLevel(): boolean {
        const adjustedNodePath = this.getNodePath(this._focussedLevel);
        adjustedNodePath.push("");
        return this._treeData.findSuggestions(adjustedNodePath).length > 0;
    }

    hasAvailableChildNodes(): boolean {
        return this._treeData.findSuggestions(this.getNodePath(this._focussedLevel)).length > 0;
    }

    countAvailableChildNodes(level?: number): number {
        let nodePath: string[];
        if (level !== undefined) {
            nodePath = level >= 0 ? [...this.getNodePath(level), ""] : [""];
        } else {
            nodePath = [...this.getNodePath(this._focussedLevel), ""];
        }
        return this._treeData.findSuggestions(nodePath).length;
    }

    getSuggestions(showAll = false): { nodeName: string; metaData: TreeDataNodeMetaData }[] {
        const nodePath = this.getNodePath(this._focussedLevel);
        if (showAll) {
            nodePath[nodePath.length - 1] = "";
        }
        return this._treeData.findSuggestions(nodePath);
    }

    containsWildcard(): boolean {
        const reg = RegExp(`^(([^${this.delimiter}\\|]+\\|)+([^${this.delimiter}\\|]+){1})$`);
        for (const el of this.getNodePath()) {
            if (el.includes("?") || el.includes("*") || (this.allowOrOperator && reg.test(el))) {
                return true;
            }
        }
        return false;
    }

    availableChildNodes(level: number): { nodeName: string; metaData: TreeDataNodeMetaData }[] {
        let nodePath: string[];
        if (level !== undefined) {
            nodePath = level >= 0 ? this.getNodePath(level) : [];
        } else {
            nodePath = this.getNodePath(this._focussedLevel);
        }
        return this._treeData.findChildNodes(nodePath);
    }

    focussedNodeNameContainsWildcard(): boolean {
        return this.getFocussedNodeName().includes("?") || this.getFocussedNodeName().includes("*");
    }

    clone(): TreeNodeSelection {
        return new TreeNodeSelection({
            focussedLevel: this.getFocussedLevel(),
            nodePath: this.getNodePath().map((x) => x) as Array<string>,
            selected: false,
            delimiter: this.delimiter,
            numMetaNodes: this._numMetaNodes,
            treeData: this._treeData,
            caseInsensitiveMatching: this.caseInsensitiveMatching,
            allowOrOperator: this.allowOrOperator,
        });
    }
}
