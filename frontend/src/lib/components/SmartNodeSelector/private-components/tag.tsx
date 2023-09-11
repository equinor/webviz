import React from "react";

import {
    ChevronDownIcon,
    ChevronUpIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    QuestionMarkCircleIcon,
    XMarkIcon,
} from "@heroicons/react/20/solid";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import "animate.css";

import { TreeNodeSelection } from "../private-utils/treeNodeSelection";

type TagProps = {
    key: string;
    index: number;
    placeholder: string;
    treeNodeSelection: TreeNodeSelection;
    countTags: number;
    currentTag: boolean;
    frameless: boolean;
    active: boolean;
    checkIfDuplicate: (nodeSelection: TreeNodeSelection, index: number) => boolean;
    inputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    inputKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    inputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    inputSelect: (e: React.SyntheticEvent<HTMLInputElement, Event>, index: number) => void;
    inputBlur: (index: number) => void;
    hideSuggestions: (callback?: () => void) => void;
    removeTag: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, index: number) => void;
    updateSelectedTagsAndNodes: () => void;
    shake: boolean;
};

/**
 * A component for displaying and interacting with a tag.
 */
export class Tag extends React.Component<TagProps> {
    props: TagProps;
    state: { hovered: boolean };

    constructor(props: TagProps) {
        super(props);

        this.props = props;
        this.state = { hovered: false };
    }

    componentDidMount(): void {
        this.forceUpdate();
    }

    private addAdditionalClasses(invalid: boolean): boolean {
        const { currentTag, treeNodeSelection } = this.props;
        return (
            treeNodeSelection.displayAsTag() ||
            (!invalid && !currentTag) ||
            (invalid && !currentTag && treeNodeSelection.getNodeName(0) !== "")
        );
    }

    private innerTagClasses(invalid = false, duplicate = false): string {
        const { treeNodeSelection } = this.props;
        let ret = {
            "text-sm flex flex-wrap rounded justify-left items-center min-w-0 m-0.5 text-slate-600 border-2 border-transparent whitespace-pre-wrap z-10 bg-no-repeat":
                true,
        };
        if (this.addAdditionalClasses(invalid)) {
            const icons = treeNodeSelection.icons();
            ret = Object.assign({}, ret, {
                [invalid
                    ? "bg-red-200"
                    : duplicate
                    ? "bg-yellow-200"
                    : icons.length > 1
                    ? "border-transparent bg-slate-50"
                    : "border-transparent bg-slate-50"]: true,
            });
        }
        return resolveClassNames(ret);
    }

    private outerTagClasses(invalid: boolean, duplicate: boolean, frameless: boolean): string {
        return resolveClassNames(
            "flex flex-wrap rounded justify-left items-center min-w-0 relative mr-2 mt-1 mb-1 text-slate-600 border-2 whitespace-pre-wrap z-10",
            {
                "border-slate-400 bg-slate-50 SmartNodeSelector__Tag": this.displayAsTag() || frameless,
                "border-transparent bg-transparent": !this.displayAsTag() && !frameless,
                animate__animated: this.props.shake,
                animate__headShake: this.props.shake,
                [!this.addAdditionalClasses(invalid)
                    ? ""
                    : invalid
                    ? "!border-red-600 !bg-red-200"
                    : duplicate
                    ? "!border-yellow-600 !bg-yellow-200"
                    : ""]: true,
            }
        );
    }

    private calculateTextWidth(text: string, padding = 10, minWidth = 50): number {
        const { treeNodeSelection } = this.props;
        const span = document.createElement("span");
        if (text === undefined) {
            text = "";
        }
        const input = (treeNodeSelection.getRef() as React.RefObject<HTMLInputElement>).current as HTMLInputElement;
        if (input) {
            const fontSize = window.getComputedStyle(input).fontSize;
            span.style.fontSize = fontSize;
        } else {
            span.style.fontSize = "0.875rem";
        }
        const textNode = document.createTextNode(text.replace(/ /g, "\u00A0"));
        span.appendChild(textNode);
        document.body.appendChild(span);
        const width = span.offsetWidth;
        document.body.removeChild(span);
        return Math.max(minWidth, width + padding);
    }

    private createMatchesCounter(nodeSelection: TreeNodeSelection, index: number): JSX.Element | null {
        if (nodeSelection.containsWildcard() && nodeSelection.countExactlyMatchedNodePaths() > 0) {
            const matches = nodeSelection.countExactlyMatchedNodePaths();
            return (
                <span
                    key={"TagMatchesCounter_" + index}
                    className="items-center bg-blue-700 text-white rounded-full h-5 justify-center mr-2 pl-1.5 pr-1.5 min-w-[5] flex outline-none relative text-center text-xs leading-none"
                    title={"This expression matches " + matches + " options."}
                >
                    {matches}
                </span>
            );
        }
        return null;
    }

    private createBrowseButtons(nodeSelection: TreeNodeSelection, index: number): React.ReactNode | null {
        const { currentTag } = this.props;
        if (
            ((nodeSelection.isValidUpToFocussedNode() && currentTag) || nodeSelection.isValid()) &&
            !nodeSelection.containsWildcard() &&
            this.displayAsTag() &&
            nodeSelection.countAvailableChildNodes(nodeSelection.getFocussedLevel() - 1) > 1
        ) {
            const subgroups = nodeSelection
                .availableChildNodes(nodeSelection.getFocussedLevel() - 1)
                .map((data) => data.nodeName);
            let position = subgroups.indexOf(nodeSelection.getFocussedNodeName());
            if (position === -1) {
                position = 0;
            }
            return (
                <div key={"TagBrowseButton_" + index} className="w-4 mr-1 h-full flex flex-col">
                    <button
                        key={"TagPreviousButton_" + index}
                        className={resolveClassNames(
                            "appearance-none bg-cyan-600 border-0 cursor-pointer inline-block outline-none p-0 m-0 h-1/2 w-4 disabled:opacity-30 disabled:cursor-default",
                            { "hover:bg-cyan-500": position !== 0 }
                        )}
                        disabled={position === 0}
                        title="Previous option"
                        onMouseDown={(e): void => this.shiftOption(e, nodeSelection, false)}
                        onMouseUp={(e): void => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onClick={(e): void => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <ChevronUpIcon className="w-4 h-4 text-white" />
                    </button>
                    <button
                        key={"TagNextButton_" + index}
                        className={resolveClassNames(
                            "appearance-none bg-cyan-600 border-0 cursor-pointer inline-block outline-none p-0 m-0 h-1/2 w-4 disabled:opacity-30 disabled:cursor-default",
                            { "hover:bg-cyan-500": position !== subgroups.length - 1 }
                        )}
                        disabled={position === subgroups.length - 1}
                        title="Next option"
                        onMouseDown={(e): void => this.shiftOption(e, nodeSelection, true)}
                        onMouseUp={(e): void => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onClick={(e): void => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <ChevronDownIcon className="w-4 h-4 text-white" />
                    </button>
                </div>
            );
        }
        return null;
    }

    private shiftOption(e: React.MouseEvent<HTMLButtonElement>, nodeSelection: TreeNodeSelection, up: boolean): void {
        e.preventDefault();
        e.stopPropagation();
        const { hideSuggestions, updateSelectedTagsAndNodes } = this.props;
        const inputElement = (nodeSelection.getRef() as React.RefObject<HTMLInputElement>).current as HTMLInputElement;
        const currentSelection = [inputElement.selectionStart, inputElement.selectionEnd];
        const subgroups = nodeSelection
            .availableChildNodes(nodeSelection.getFocussedLevel() - 1)
            .map((el) => el.nodeName);
        const newPosition = subgroups.indexOf(nodeSelection.getFocussedNodeName()) + (up ? 1 : -1);
        if (!up && newPosition < 0) return;
        if (up && newPosition >= subgroups.length) return;
        nodeSelection.setNodeName(subgroups[newPosition]);
        hideSuggestions(() => {
            if (currentSelection[0] !== null && currentSelection[1] !== null) {
                window.setTimeout(() => {
                    inputElement.setSelectionRange(currentSelection[0], currentSelection[1]);
                }, 20);
            }
        });
        updateSelectedTagsAndNodes();
        this.forceUpdate();
    }

    private tagTitle(nodeSelection: TreeNodeSelection, index: number): string {
        const { countTags, checkIfDuplicate } = this.props;
        if (index === countTags - 1 && !nodeSelection.displayAsTag()) {
            return "Enter a new name";
        } else if (!nodeSelection.isValid()) {
            return "Invalid";
        } else if (checkIfDuplicate(nodeSelection, index)) {
            return "Duplicate";
        } else if (!nodeSelection.isComplete()) {
            return "Incomplete";
        } else {
            return nodeSelection.exactlyMatchedNodePaths().join("\n");
        }
    }

    private handleInput(e: React.FormEvent<HTMLInputElement>): void {
        const val = (e.target as HTMLInputElement).value;
        if (val) {
            (e.target as HTMLInputElement).style.width = this.calculateTextWidth(val) + "px";
        }
    }

    private displayAsTag(): boolean {
        const { treeNodeSelection, currentTag } = this.props;

        return (
            treeNodeSelection.displayAsTag() ||
            (treeNodeSelection.isValid() && currentTag) ||
            (treeNodeSelection.getNodeName(0) !== "" && !currentTag)
        );
    }

    private createFocusOverlay(treeNodeSelection: TreeNodeSelection): React.ReactNode | null {
        const inputElement = (treeNodeSelection.getRef() as React.RefObject<HTMLInputElement>)
            .current as HTMLInputElement;
        if (inputElement) {
            const inputContainerBoundingRect = (inputElement.parentElement as HTMLElement).getBoundingClientRect();
            const inputBoundingRect = inputElement.getBoundingClientRect();
            let left = inputBoundingRect.left - inputContainerBoundingRect.left;

            const value = treeNodeSelection.displayText();

            let width = this.calculateTextWidth(value, 0, 0);
            let distanceLeft = 0;
            const splitByDelimiter = value.split(treeNodeSelection.getDelimiter());
            if (splitByDelimiter.length > 1) {
                const currentText =
                    splitByDelimiter[treeNodeSelection.getFocussedLevel() - treeNodeSelection.getNumMetaNodes()];
                width = this.calculateTextWidth(currentText, 0, 0);
                const splitByCurrentText = [
                    ...splitByDelimiter.filter(
                        (_, index) => index < treeNodeSelection.getFocussedLevel() - treeNodeSelection.getNumMetaNodes()
                    ),
                    "",
                ].join(treeNodeSelection.getDelimiter());

                if (splitByCurrentText[0] !== undefined) {
                    distanceLeft = this.calculateTextWidth(splitByCurrentText, 0, 0);
                }
            }

            left += distanceLeft;

            return (
                <div
                    className="border-b border-b-blue-600 border-dashed absolute h-0.5 bottom-0"
                    style={{
                        left: left + "px",
                        width: width + "px",
                    }}
                ></div>
            );
        } else {
            return null;
        }
    }

    private calculateInputWidth(): string {
        const { treeNodeSelection } = this.props;
        const displayText = treeNodeSelection.displayText();

        if (treeNodeSelection.getFocussedNodeName() === "" && treeNodeSelection.getFocussedLevel() == 0) {
            return this.calculateTextWidth(this.props.placeholder) + "px";
        } else {
            return this.calculateTextWidth(displayText) + "px";
        }
    }

    private makeStyle(): { [key: string]: string | number } {
        const { treeNodeSelection, frameless } = this.props;

        const colors = treeNodeSelection.colors();
        const style: { [key: string]: string } = {
            borderWidth: "1px",
            borderStyle: "solid",
        };

        if (colors.length >= 2) {
            style["background"] = `linear-gradient(to left, ${colors.join(", ")}) border-box`;
            style["borderColor"] = "transparent";
        } else {
            style["borderColor"] = colors[0];
        }

        if (frameless) {
            style["flex"] = "1";
        }

        return style;
    }

    private handleClickEvent(e: React.MouseEvent<HTMLLIElement>): void {
        const input = (this.props.treeNodeSelection.getRef() as React.RefObject<HTMLInputElement>)
            .current as HTMLInputElement;
        if (input) {
            input.focus();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    render(): React.ReactNode {
        const {
            index,
            treeNodeSelection,
            currentTag,
            frameless,
            active,
            checkIfDuplicate,
            inputKeyDown,
            inputKeyUp,
            inputChange,
            inputSelect,
            inputBlur,
            removeTag,
        } = this.props;

        const displayText = treeNodeSelection.displayText();

        const valid = treeNodeSelection.isValid();
        const duplicate = checkIfDuplicate(treeNodeSelection, index);

        return (
            <li
                key={"Tag_" + index}
                title={this.tagTitle(treeNodeSelection, index)}
                className={this.outerTagClasses(!valid && !currentTag, duplicate, frameless)}
                style={this.makeStyle()}
                onMouseEnter={(): void => this.setState({ hovered: true })}
                onMouseLeave={(): void => this.setState({ hovered: false })}
                onClick={(e): void => this.handleClickEvent(e)}
            >
                {this.displayAsTag() && !frameless && (
                    <button
                        type="button"
                        key={"TagRemoveButton_" + index}
                        className="absolute -right-2 -top-2 bg-cyan-600 border border-white rounded-full cursor-pointer w-4 h-4 p-0 flex items-center justify-center hover:bg-cyan-500 z-20"
                        title="Remove"
                        onClick={(e): void => removeTag(e, index)}
                    >
                        <XMarkIcon className="w-3 h-3 text-white" />
                    </button>
                )}
                {this.createBrowseButtons(treeNodeSelection, index)}
                <div
                    key={"InnerTag_" + index}
                    className={this.innerTagClasses(!valid && !currentTag, duplicate)}
                    style={
                        (valid || currentTag) && !duplicate && treeNodeSelection.icons().length === 1
                            ? {
                                  backgroundImage: "url(" + treeNodeSelection.icons()[0] + ")",
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "left center",
                                  backgroundSize: "16px 16px",
                                  paddingLeft: 24,
                              }
                            : {}
                    }
                >
                    {this.addAdditionalClasses(!valid) && !valid && !currentTag && (
                        <ExclamationCircleIcon className="w-4 h-4 mr-2" />
                    )}
                    {this.addAdditionalClasses(!valid) && valid && duplicate && (
                        <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                    )}
                    {this.addAdditionalClasses(!valid) &&
                        (valid || currentTag) &&
                        !duplicate &&
                        treeNodeSelection.icons().length > 1 && <QuestionMarkCircleIcon className="w-4 h-4 mr-2" />}
                    {this.createMatchesCounter(treeNodeSelection, index)}
                    <div className="flex whitespace-nowrap relative">
                        <input
                            className="border-0 bg-transparent outline-none p-0 w-12 inline-block text-sm"
                            spellCheck="false"
                            key={"TagInput_" + index}
                            type="text"
                            placeholder={
                                treeNodeSelection.getFocussedNodeName() === "" &&
                                treeNodeSelection.getFocussedLevel() == 0
                                    ? treeNodeSelection.getRef() && active
                                        ? ""
                                        : this.props.placeholder
                                    : ""
                            }
                            value={displayText}
                            style={{
                                width: this.calculateInputWidth(),
                            }}
                            ref={treeNodeSelection.getRef()}
                            onInput={(e): void => this.handleInput(e)}
                            onClick={(e): void => e.stopPropagation()}
                            onChange={(e): void => inputChange(e)}
                            onKeyUp={(e): void => inputKeyUp(e)}
                            onKeyDown={(e): void => inputKeyDown(e)}
                            onSelect={(e): void => inputSelect(e, index)}
                            onBlur={(): void => inputBlur(index)}
                        />
                        {(currentTag || this.state.hovered) &&
                            !treeNodeSelection.isSelected() &&
                            this.createFocusOverlay(treeNodeSelection)}
                    </div>
                    {treeNodeSelection.isSelected() && (
                        <div
                            key={"TagSelected_" + index}
                            className="bg-blue-500 opacity-30 absolute left-0 top-0 w-full h-full block z-10 rounded"
                        ></div>
                    )}
                </div>
            </li>
        );
    }
}
