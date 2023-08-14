import React from "react";
import ReactDOM from "react-dom";

import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

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
    public props: SuggestionsProps;
    public state: SuggestionsState;
    public static propTypes: Record<string, unknown>;
    public static defaultProps: Partial<SuggestionsProps> = {};

    private mouseMoved: boolean;
    private currentlySelectedSuggestionIndex: number;
    private rowHeight: number;
    private upperSpacerHeight: number;
    private allOptions: Option[];
    private currentNodeLevel: number;
    private currentNodeName: string;
    private lastNodeSelection?: TreeNodeSelection;
    private positionRef: React.RefObject<HTMLDivElement>;
    private popup: HTMLDivElement | null;
    private showingAllSuggestions: boolean;

    constructor(props: SuggestionsProps) {
        super(props);

        this.props = props;
        this.mouseMoved = false;
        this.currentlySelectedSuggestionIndex = 0;
        this.rowHeight = 34;
        this.upperSpacerHeight = 0;
        this.currentNodeLevel = -1;
        this.currentNodeName = "";
        this.lastNodeSelection = props.treeNodeSelection;
        this.allOptions = [];
        this.positionRef = React.createRef();
        this.popup = null;
        this.showingAllSuggestions = false;

        this.state = {
            fromIndex: 0,
        };

        if (this.props.treeNodeSelection) {
            this.allOptions = this.props.treeNodeSelection.getSuggestions();
            this.currentNodeLevel = this.props.treeNodeSelection.getFocussedLevel();
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

        this.popup = document.createElement("div");
        document.body.appendChild(this.popup);
    }

    componentWillUnmount(): void {
        document.removeEventListener("mousemove", this.handleMouseMove, true);
        document.removeEventListener("keydown", this.handleGlobalKeyDown, true);
        window.removeEventListener("resize", this.renderPopup);
        window.removeEventListener("scroll", this.renderPopup, true);

        if (this.popup) {
            document.body.removeChild(this.popup);
        }
    }

    componentDidUpdate(previousProps: SuggestionsProps): void {
        const { visible, treeNodeSelection, suggestionsRef } = this.props;
        if (previousProps.visible != visible || previousProps.treeNodeSelection != treeNodeSelection) {
            this.upperSpacerHeight = 0;
            if (suggestionsRef.current) {
                (suggestionsRef.current as HTMLDivElement).scrollTop = 0;
            }
            this.currentlySelectedSuggestionIndex = 0;
            this.setState({ fromIndex: 0 });
        }

        if (this.popup) {
            this.renderPopup();
        }
    }

    private currentlySelectedSuggestion(): Element {
        return document.getElementsByClassName("Suggestions__Suggestion")[
            this.currentlySelectedSuggestionIndex - this.state.fromIndex
        ];
    }

    private maybeLoadNewOptions(): void {
        const { treeNodeSelection, suggestionsRef, showAllSuggestions } = this.props;
        if (
            treeNodeSelection !== undefined &&
            (treeNodeSelection.getFocussedLevel() !== this.currentNodeLevel ||
                treeNodeSelection.getFocussedNodeName() !== this.currentNodeName ||
                this.lastNodeSelection === undefined ||
                !treeNodeSelection.objectEquals(this.lastNodeSelection) ||
                this.props.showAllSuggestions !== this.showingAllSuggestions)
        ) {
            this.showingAllSuggestions = this.props.showAllSuggestions;
            this.allOptions = treeNodeSelection.getSuggestions(showAllSuggestions);
            this.currentNodeLevel = treeNodeSelection.getFocussedLevel();
            this.lastNodeSelection = treeNodeSelection;
            this.currentNodeName = treeNodeSelection.getFocussedNodeName();
            if (suggestionsRef.current) {
                (suggestionsRef.current as HTMLDivElement).scrollTo(0, 0);
            }
        }
    }

    private handleMouseMove(): void {
        this.mouseMoved = true;
    }

    private handleGlobalKeyDown(e: globalThis.KeyboardEvent): void {
        const { visible } = this.props;
        if (visible) {
            if (e.key === "ArrowUp") {
                this.markSuggestionAsHoveredAndMakeVisible(Math.max(0, this.currentlySelectedSuggestionIndex - 1));
            } else if (e.key === "ArrowDown") {
                this.markSuggestionAsHoveredAndMakeVisible(
                    Math.min(this.allOptions.length - 1, this.currentlySelectedSuggestionIndex + 1)
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
        const height = Math.min(maxHeight, this.allOptions.length * this.rowHeight);
        const index = Math.min(
            Math.floor((suggestionsRef.current as HTMLDivElement).scrollTop / this.rowHeight),
            this.allOptions.length - Math.floor(height / this.rowHeight)
        );
        const remainder = (suggestionsRef.current as HTMLDivElement).scrollTop - index * this.rowHeight;
        this.upperSpacerHeight = (suggestionsRef.current as HTMLDivElement).scrollTop - remainder;
        this.setState({ fromIndex: index });
    }

    private maybeMarkSuggestionAsHovered(index: number): void {
        if (this.mouseMoved) {
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
            Math.floor(maxHeight / this.rowHeight),
            this.allOptions.length - this.state.fromIndex
        );

        const currentRangeStart = this.state.fromIndex;
        const currentRangeEnd = this.state.fromIndex + maxNumSuggestions;

        if (index >= currentRangeStart && index <= currentRangeEnd) {
            this.markSuggestionAsHovered(index);
            this.scrollSuggestionsToMakeSelectedElementVisible();
        } else if (index < currentRangeStart) {
            this.currentlySelectedSuggestionIndex = index;
            suggestions.scroll(0, this.currentlySelectedSuggestionIndex * this.rowHeight);
        } else if (index > currentRangeEnd) {
            this.currentlySelectedSuggestionIndex = index;
            suggestions.scroll(0, (this.currentlySelectedSuggestionIndex + 1) * this.rowHeight - maxHeight);
        }
    }

    private markSuggestionAsHovered(index: number): void {
        this.currentlySelectedSuggestionIndex = index;
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
        this.mouseMoved = false;
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
        this.currentlySelectedSuggestionIndex = 0;
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
            const options = this.allOptions.slice(
                this.state.fromIndex,
                this.state.fromIndex + Math.ceil(maxHeight / this.rowHeight)
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
                                        i === this.currentlySelectedSuggestionIndex - this.state.fromIndex,
                                }
                            )}
                            style={{
                                color: option.metaData.color !== undefined ? option.metaData.color : "inherit",
                                backgroundImage:
                                    option.metaData.icon !== undefined ? "url(" + option.metaData.icon + ")" : "none",
                                height: this.rowHeight + "px",
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
        const height = Math.min(maxHeight, this.allOptions.length * this.rowHeight);
        let lowerSpacerHeight =
            this.allOptions.length * this.rowHeight -
            this.upperSpacerHeight -
            Math.floor(height / this.rowHeight) * this.rowHeight;
        if (Math.ceil(height / this.rowHeight) == this.allOptions.length - this.state.fromIndex) {
            lowerSpacerHeight = 0;
        }

        const boundingRect = this.positionRef.current
            ? {
                  top: this.positionRef.current.getBoundingClientRect().top + window.scrollY,
                  left: this.positionRef.current.getBoundingClientRect().left + window.scrollX,
                  bottom: this.positionRef.current.getBoundingClientRect().bottom + window.scrollY,
                  right: this.positionRef.current.getBoundingClientRect().right + window.scrollX,
                  width: this.positionRef.current.getBoundingClientRect().width,
                  height: this.positionRef.current.getBoundingClientRect().height,
              }
            : {
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  width: 0,
                  height: 0,
              };

        ReactDOM.render(
            <div
                ref={suggestionsRef}
                className="box-border absolute top-full -left-[1] -right-[1] border bg-white rounded-b shadow z-50 overflow-y-auto"
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
                    className="Suggestions__Spacer"
                    style={{
                        height: this.upperSpacerHeight + "px",
                    }}
                ></div>
                {this.createSuggestionsForCurrentTag(maxHeight)}
                <div
                    className="Suggestions__Spacer"
                    style={{
                        height: lowerSpacerHeight + "px",
                    }}
                ></div>
            </div>,
            this.popup
        );
    }

    render(): React.ReactNode {
        return (
            <div
                ref={this.positionRef}
                className="w-full box-border absolute top-full -left-[1px] -right-[1px] border bg-white rounded-b shadow-lg z-50 overflow-y-auto invisible"
            ></div>
        );
    }
}
