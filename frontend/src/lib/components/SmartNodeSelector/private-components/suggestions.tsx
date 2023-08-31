import React from "react";
import { Root, createRoot } from "react-dom/client";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TreeDataNodeMetaData } from "../private-utils/treeDataNodeTypes";
import { TreeNodeSelection } from "../private-utils/treeNodeSelection";

type SuggestionsProps = {
    suggestionsRef: React.RefObject<HTMLDivElement>;
    tagInputFieldRef: React.RefObject<HTMLUListElement>;
    visible: boolean;
    useSuggestion: (e: globalThis.KeyboardEvent | React.MouseEvent<HTMLDivElement>, option: string) => void;
    treeNodeSelection?: TreeNodeSelection;
    showAllSuggestions: boolean;
    enableInputBlur: () => void;
    disableInputBlur: () => void;
};

type SuggestionsState = {
    fromIndex: number;
};

type Option = { nodeName: string; metaData: TreeDataNodeMetaData };

export class Suggestions extends React.Component<SuggestionsProps> {
    props: SuggestionsProps;
    state: SuggestionsState;

    private _mouseMoved: boolean;
    private _currentlySelectedSuggestionIndex: number;
    private _rowHeight: number;
    private _upperSpacerHeight: number;
    private _allOptions: Option[];
    private _currentNodeLevel: number;
    private _currentNodeName: string;
    private _lastNodeSelection?: TreeNodeSelection;
    private _positionRef: React.RefObject<HTMLDivElement>;
    private _popup: HTMLDivElement | null;
    private _popupRoot: Root | null;
    private _showingAllSuggestions: boolean;

    constructor(props: SuggestionsProps) {
        super(props);

        this.props = props;
        this._mouseMoved = false;
        this._currentlySelectedSuggestionIndex = 0;
        this._rowHeight = 34;
        this._upperSpacerHeight = 0;
        this._currentNodeLevel = -1;
        this._currentNodeName = "";
        this._lastNodeSelection = props.treeNodeSelection;
        this._allOptions = [];
        this._positionRef = React.createRef();
        this._popup = null;
        this._popupRoot = null;
        this._showingAllSuggestions = false;

        this.state = {
            fromIndex: 0,
        };

        if (this.props.treeNodeSelection) {
            this._allOptions = this.props.treeNodeSelection.getSuggestions();
            this._currentNodeLevel = this.props.treeNodeSelection.getFocussedLevel();
        }

        this.renderPopup = this.renderPopup.bind(this);
        this.maybeLoadNewOptions = this.maybeLoadNewOptions.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleGlobalKeyDown = this.handleGlobalKeyDown.bind(this);
        this.markSuggestionAsHoveredAndMakeVisible = this.markSuggestionAsHoveredAndMakeVisible.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
    }

    componentDidMount(): void {
        document.addEventListener("mousemove", this.handleMouseMove, true);
        document.addEventListener("keydown", this.handleGlobalKeyDown, true);
        window.addEventListener("resize", this.renderPopup);
        window.addEventListener("scroll", this.renderPopup, true);

        this._popup = document.createElement("div");
        document.body.appendChild(this._popup);
        this._popupRoot = createRoot(this._popup);
    }

    componentWillUnmount(): void {
        document.removeEventListener("mousemove", this.handleMouseMove, true);
        document.removeEventListener("keydown", this.handleGlobalKeyDown, true);
        window.removeEventListener("resize", this.renderPopup);
        window.removeEventListener("scroll", this.renderPopup, true);

        if (this._popup) {
            document.body.removeChild(this._popup);
        }
    }

    componentDidUpdate(previousProps: SuggestionsProps): void {
        const { visible, treeNodeSelection, suggestionsRef } = this.props;
        if (previousProps.visible != visible || previousProps.treeNodeSelection != treeNodeSelection) {
            this._upperSpacerHeight = 0;
            if (suggestionsRef.current) {
                (suggestionsRef.current as HTMLDivElement).scrollTop = 0;
            }
            this._currentlySelectedSuggestionIndex = 0;
            this.setState({ fromIndex: 0 });
        }

        if (this._popup) {
            this.renderPopup();
        }
    }

    private currentlySelectedSuggestion(): Element {
        return document.getElementsByClassName("Suggestions__Suggestion")[
            this._currentlySelectedSuggestionIndex - this.state.fromIndex
        ];
    }

    private maybeLoadNewOptions(): void {
        const { treeNodeSelection, suggestionsRef, showAllSuggestions } = this.props;
        if (
            treeNodeSelection !== undefined &&
            (treeNodeSelection.getFocussedLevel() !== this._currentNodeLevel ||
                treeNodeSelection.getFocussedNodeName() !== this._currentNodeName ||
                this._lastNodeSelection === undefined ||
                !treeNodeSelection.objectEquals(this._lastNodeSelection) ||
                this.props.showAllSuggestions !== this._showingAllSuggestions)
        ) {
            this._showingAllSuggestions = this.props.showAllSuggestions;
            this._allOptions = treeNodeSelection.getSuggestions(showAllSuggestions);
            this._currentNodeLevel = treeNodeSelection.getFocussedLevel();
            this._lastNodeSelection = treeNodeSelection;
            this._currentNodeName = treeNodeSelection.getFocussedNodeName();
            if (suggestionsRef.current) {
                (suggestionsRef.current as HTMLDivElement).scrollTo(0, 0);
            }
        }
    }

    private handleMouseMove(): void {
        this._mouseMoved = true;
    }

    private handleGlobalKeyDown(e: globalThis.KeyboardEvent): void {
        const { visible } = this.props;
        if (visible) {
            if (e.key === "ArrowUp") {
                this.markSuggestionAsHoveredAndMakeVisible(Math.max(0, this._currentlySelectedSuggestionIndex - 1));
            } else if (e.key === "ArrowDown") {
                this.markSuggestionAsHoveredAndMakeVisible(
                    Math.min(this._allOptions.length - 1, this._currentlySelectedSuggestionIndex + 1)
                );
            }
            if (e.key == "Enter" && this.currentlySelectedSuggestion() !== undefined) {
                this.useSuggestion(e, this.currentlySelectedSuggestion().getAttribute("data-use") as string);
            }
        }
    }

    private handleScroll(): void {
        const { tagInputFieldRef, suggestionsRef } = this.props;
        const maxHeight =
            window.innerHeight -
            (tagInputFieldRef.current ? tagInputFieldRef.current.getBoundingClientRect().bottom + 10 : 200);
        const height = Math.min(maxHeight, this._allOptions.length * this._rowHeight);
        const index = Math.min(
            Math.floor((suggestionsRef.current as HTMLDivElement).scrollTop / this._rowHeight),
            this._allOptions.length - Math.floor(height / this._rowHeight)
        );
        const remainder = (suggestionsRef.current as HTMLDivElement).scrollTop - index * this._rowHeight;
        this._upperSpacerHeight = (suggestionsRef.current as HTMLDivElement).scrollTop - remainder;
        this.setState({ fromIndex: index });
    }

    private maybeMarkSuggestionAsHovered(index: number): void {
        if (this._mouseMoved) {
            this.markSuggestionAsHovered(index);
        }
    }

    private markSuggestionAsHoveredAndMakeVisible(index: number): void {
        const { suggestionsRef } = this.props;
        const suggestions = suggestionsRef.current;
        if (!suggestions) return;

        const { tagInputFieldRef } = this.props;
        const maxHeight =
            window.innerHeight -
            (tagInputFieldRef.current ? tagInputFieldRef.current.getBoundingClientRect().bottom + 10 : 200);

        const maxNumSuggestions = Math.min(
            Math.floor(maxHeight / this._rowHeight),
            this._allOptions.length - this.state.fromIndex
        );

        const currentRangeStart = this.state.fromIndex;
        const currentRangeEnd = this.state.fromIndex + maxNumSuggestions;

        if (index >= currentRangeStart && index <= currentRangeEnd) {
            this.markSuggestionAsHovered(index);
            this.scrollSuggestionsToMakeSelectedElementVisible();
        } else if (index < currentRangeStart) {
            this._currentlySelectedSuggestionIndex = index;
            suggestions.scroll(0, this._currentlySelectedSuggestionIndex * this._rowHeight);
        } else if (index > currentRangeEnd) {
            this._currentlySelectedSuggestionIndex = index;
            suggestions.scroll(0, (this._currentlySelectedSuggestionIndex + 1) * this._rowHeight - maxHeight);
        }
    }

    private markSuggestionAsHovered(index: number): void {
        this._currentlySelectedSuggestionIndex = index;
        const newSelectedSuggestion = this.currentlySelectedSuggestion();
        const selectedSuggestions = document.getElementsByClassName("Suggestions__Suggestion--Selected");
        for (let i = 0; i < selectedSuggestions.length; i++) {
            const el = selectedSuggestions[i];
            el.classList.remove("Suggestions__Suggestion--Selected");
            el.classList.remove("bg-blue-100");
        }
        newSelectedSuggestion.classList.add("Suggestions__Suggestion--Selected");
        newSelectedSuggestion.classList.add("bg-blue-100");
    }

    private scrollSuggestionsToMakeSelectedElementVisible(): void {
        const { suggestionsRef } = this.props;
        this._mouseMoved = false;
        const element = this.currentlySelectedSuggestion();
        const suggestions = suggestionsRef.current;
        if (!suggestions) return;

        const elementBoundingRect = element.getBoundingClientRect();
        const suggestionsBoundingRect = suggestions.getBoundingClientRect();

        if (elementBoundingRect.bottom > suggestionsBoundingRect.bottom) {
            suggestions.scroll(0, suggestions.scrollTop + elementBoundingRect.bottom - suggestionsBoundingRect.bottom);
        } else if (elementBoundingRect.top < suggestionsBoundingRect.top) {
            suggestions.scroll(0, suggestions.scrollTop + elementBoundingRect.top - suggestionsBoundingRect.top);
        }
    }

    private useSuggestion(e: globalThis.KeyboardEvent | React.MouseEvent<HTMLDivElement>, suggestion: string): void {
        this._currentlySelectedSuggestionIndex = 0;
        this.props.useSuggestion(e, suggestion);
    }

    private decorateOption(option: Option, treeNodeSelection: TreeNodeSelection): React.ReactNode {
        const regexName = RegExp(`^${treeNodeSelection.getFocussedNodeName()}`, "i");
        const regexDescription = RegExp(`${treeNodeSelection.getFocussedNodeName()}`, "i");
        const matchName = option.nodeName.match(regexName);
        const matchDescription = option.metaData.description?.match(regexDescription);

        const matchedNodePart = matchName ? option.nodeName.substring(0, matchName[0].length) : "";
        const unmatchedNodePart = matchName
            ? option.nodeName.substring(matchName[0].length, option.nodeName.length)
            : option.nodeName;

        const unmatchedDescriptionPartBefore = matchDescription
            ? option.metaData.description?.substring(0, matchDescription.index as number)
            : option.metaData.description;

        const matchedDescription = matchDescription
            ? option.metaData.description?.substring(
                  matchDescription.index as number,
                  (matchDescription.index as number) + matchDescription[0].length
              )
            : "";

        const unmatchedDescriptionPartAfter = matchDescription
            ? option.metaData.description?.substring(
                  (matchDescription.index as number) + matchDescription[0].length,
                  option.metaData.description.length
              )
            : "";

        return (
            <>
                <span className="bold underline">{matchedNodePart}</span>
                {unmatchedNodePart}
                {option.metaData.description && (
                    <>
                        - {unmatchedDescriptionPartBefore}
                        <span className="bold underline">{matchedDescription}</span>
                        {unmatchedDescriptionPartAfter}
                    </>
                )}
            </>
        );
    }

    private createSuggestionsForCurrentTag(maxHeight: number): React.ReactNode | null {
        const { treeNodeSelection, enableInputBlur, disableInputBlur } = this.props;
        if (treeNodeSelection === undefined) return "";
        if (!treeNodeSelection.focussedNodeNameContainsWildcard()) {
            const options = this._allOptions.slice(
                this.state.fromIndex,
                this.state.fromIndex + Math.ceil(maxHeight / this._rowHeight)
            );
            return (
                <>
                    {options.map((option, i) => (
                        <div
                            key={option.nodeName}
                            onMouseEnter={(): void => this.maybeMarkSuggestionAsHovered(i + this.state.fromIndex)}
                            data-use={option.nodeName}
                            data-index={i}
                            className={resolveClassNames(
                                "Suggestions__Suggestion p-2 cursor-pointer box-border h-8 leading-6 whitespace-nowrap overflow-hidden text-ellipsis bg-no-repeat text-sm",
                                {
                                    "bg-[20px 20px] pl-8": option.metaData.icon !== undefined,
                                    "bg-blue-100 Suggestions__Suggestion--Selected":
                                        i === this._currentlySelectedSuggestionIndex - this.state.fromIndex,
                                }
                            )}
                            style={{
                                color: option.metaData.color !== undefined ? option.metaData.color : "inherit",
                                backgroundImage:
                                    option.metaData.icon !== undefined ? "url(" + option.metaData.icon + ")" : "none",
                                height: this._rowHeight + "px",
                                backgroundPosition: option.metaData.icon !== undefined ? "5px center" : undefined,
                                backgroundSize: option.metaData.icon !== undefined ? "20px 20px" : undefined,
                            }}
                            onMouseDown={disableInputBlur}
                            onMouseUp={enableInputBlur}
                            onClick={(e): void => {
                                this.useSuggestion(e, option.nodeName);
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            title={`${option.nodeName} - ${option.metaData.description}`}
                        >
                            {this.decorateOption(option, treeNodeSelection)}
                        </div>
                    ))}
                    {options.length === 0 && <div className="p-4 italic">No options available...</div>}
                </>
            );
        }
        return null;
    }

    renderPopup(): void {
        this.maybeLoadNewOptions();
        const { tagInputFieldRef, visible, suggestionsRef } = this.props;
        const maxHeight =
            window.innerHeight -
            (tagInputFieldRef.current ? tagInputFieldRef.current.getBoundingClientRect().bottom + 10 : 200);
        const height = Math.min(maxHeight, this._allOptions.length * this._rowHeight);
        let lowerSpacerHeight =
            this._allOptions.length * this._rowHeight -
            this._upperSpacerHeight -
            Math.floor(height / this._rowHeight) * this._rowHeight;
        if (Math.ceil(height / this._rowHeight) == this._allOptions.length - this.state.fromIndex) {
            lowerSpacerHeight = 0;
        }

        const boundingRect = this._positionRef.current
            ? {
                  top: this._positionRef.current.getBoundingClientRect().top + window.scrollY,
                  left: this._positionRef.current.getBoundingClientRect().left + window.scrollX,
                  bottom: this._positionRef.current.getBoundingClientRect().bottom + window.scrollY,
                  right: this._positionRef.current.getBoundingClientRect().right + window.scrollX,
                  width: this._positionRef.current.getBoundingClientRect().width,
                  height: this._positionRef.current.getBoundingClientRect().height,
              }
            : {
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  width: 0,
                  height: 0,
              };

        if (!this._popupRoot) return;

        this._popupRoot.render(
            <div
                ref={suggestionsRef}
                className="box-border absolute top-full left-0 w-full border bg-white rounded-b shadow z-50 overflow-y-auto"
                onScroll={this.handleScroll}
                style={{
                    maxHeight: maxHeight,
                    display: visible ? "block" : "none",
                    top: boundingRect.top,
                    left: boundingRect.left,
                    width: boundingRect.width,
                }}
            >
                <div
                    style={{
                        height: this._upperSpacerHeight + "px",
                    }}
                ></div>
                {this.createSuggestionsForCurrentTag(maxHeight)}
                <div
                    style={{
                        height: lowerSpacerHeight + "px",
                    }}
                ></div>
            </div>
        );
    }

    render(): React.ReactNode {
        return (
            <div
                ref={this._positionRef}
                className="w-full box-border absolute top-full left-0 border bg-white rounded-b shadow-lg z-50 overflow-y-auto invisible"
            ></div>
        );
    }
}
