import React from "react";

import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidthWithFont } from "@lib/utils/textSize";
import { Close, ExpandMore } from "@mui/icons-material";

import { isEqual } from "lodash";

import { BaseComponent, BaseComponentProps } from "../BaseComponent";
import { Checkbox } from "../Checkbox";
import { IconButton } from "../IconButton";
import { Virtualization } from "../Virtualization";

export type TagOption<T> = {
    value: T;
    label: string;
};

export type TagPickerProps<T> = {
    id?: string;
    wrapperId?: string;
    tags: TagOption<T>[];
    value: T[];
    onChange?: (value: T[]) => void;
    width?: string | number;
    debounceTimeMs?: number;
} & BaseComponentProps;

const MIN_HEIGHT = 200;
const TAG_HEIGHT = 32;

type DropdownRect = {
    left?: number;
    top?: number;
    right?: number;
    width: number;
    height: number;
    minWidth: number;
};

const NO_MATCHING_TAGS_TEXT = "No matching tags";
const NO_TAGS_TEXT = "No tags";

export function TagPicker<T>(props: TagPickerProps<T>): React.ReactElement {
    const [selectedTags, setSelectedTags] = React.useState<T[]>(props.value);
    const [prevSelectedTags, setPrevSelectedTags] = React.useState<T[]>(props.value);
    const [dropdownVisible, setDropdownVisible] = React.useState<boolean>(false);
    const [dropdownRect, setDropdownRect] = React.useState<DropdownRect>({
        width: 0,
        minWidth: 0,
        height: 0,
    });
    const [filter, setFilter] = React.useState<string | null>(null);
    const [filteredTags, setFilteredTags] = React.useState<TagOption<T>[]>(props.tags);
    const [startIndex, setStartIndex] = React.useState<number>(0);
    const [focused, setFocused] = React.useState<boolean>(false);

    const divRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const divBoundingRect = useElementBoundingRect(divRef);

    if (!isEqual(props.value, prevSelectedTags)) {
        setSelectedTags(props.value);
        if (filter) {
            setFilteredTags(props.tags.filter((option) => option.label.toLowerCase().includes(filter)));
        } else {
            setFilteredTags(props.tags);
        }
        setPrevSelectedTags(props.value);
    }

    React.useEffect(function handleMount() {
        const debounceTimerRefCurrent = debounceTimerRef.current;
        return function handleUnmount() {
            if (debounceTimerRefCurrent) {
                clearTimeout(debounceTimerRefCurrent);
            }
        };
    }, []);

    React.useEffect(function handleTagsChange() {
        function handleMouseDown(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                divRef.current &&
                !divRef.current.contains(event.target as Node)
            ) {
                setDropdownVisible(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setDropdownVisible(false);
                inputRef.current?.blur();
                setFocused(false);
                return;
            }
        }

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, []);

    React.useEffect(
        function updateDropdownRectWidth() {
            let longestTagWidth = props.tags.reduce((prev, current) => {
                const labelWidth = getTextWidthWithFont(current.label, "Equinor", 1);
                const totalWidth = labelWidth;
                if (totalWidth > prev) {
                    return totalWidth;
                }
                return prev;
            }, 0);

            if (longestTagWidth === 0) {
                if (props.tags.length === 0 || filter === "") {
                    longestTagWidth = getTextWidthWithFont(NO_TAGS_TEXT, "Equinor", 1);
                } else {
                    longestTagWidth = getTextWidthWithFont(NO_MATCHING_TAGS_TEXT, "Equinor", 1);
                }
            }
            setDropdownRect((prev) => ({ ...prev, width: longestTagWidth + 32 }));

            const newFilteredOptions = props.tags.filter((tag) => tag.label.toLowerCase().includes(filter || ""));
            setFilteredTags(newFilteredOptions);
        },
        [props.tags, filter]
    );

    React.useEffect(
        function computeDropdownRect() {
            if (dropdownVisible) {
                const divClientBoundingRect = divRef.current?.getBoundingClientRect();
                const bodyClientBoundingRect = document.body.getBoundingClientRect();

                const height = Math.min(MIN_HEIGHT, Math.max(filteredTags.length * TAG_HEIGHT, TAG_HEIGHT)) + 2;

                if (divClientBoundingRect && bodyClientBoundingRect) {
                    const newDropdownRect: DropdownRect = {
                        minWidth: divBoundingRect.width,
                        width: dropdownRect.width,
                        height: height,
                    };

                    if (divClientBoundingRect.y + divBoundingRect.height + height > window.innerHeight) {
                        newDropdownRect.top = divClientBoundingRect.y - height;
                        newDropdownRect.height = Math.min(height, divClientBoundingRect.y);
                    } else {
                        newDropdownRect.top = divClientBoundingRect.y + divBoundingRect.height;
                        newDropdownRect.height = Math.min(
                            height,
                            window.innerHeight - divClientBoundingRect.y - divBoundingRect.height
                        );
                    }
                    if (divClientBoundingRect.x + divBoundingRect.width > window.innerWidth / 2) {
                        newDropdownRect.right = window.innerWidth - (divClientBoundingRect.x + divBoundingRect.width);
                    } else {
                        newDropdownRect.left = divClientBoundingRect.x;
                    }

                    setDropdownRect((prev) => ({ ...newDropdownRect, width: prev.width }));

                    setStartIndex(
                        Math.max(
                            0,
                            Math.round(
                                (filteredTags.findIndex((tag) => tag.value === selectedTags[selectedTags.length - 1]) ||
                                    0) -
                                    height / TAG_HEIGHT / 2
                            )
                        )
                    );
                }
            }
        },
        [divBoundingRect, dropdownVisible, filteredTags, selectedTags, dropdownRect.width, props.tags]
    );

    function handleInputClick() {
        setDropdownVisible(true);
    }

    function handleTagToggle(value: T) {
        let newSelectedTags = [...selectedTags];
        if (selectedTags.includes(value)) {
            newSelectedTags = newSelectedTags.filter((v) => v !== value);
        } else {
            newSelectedTags.push(value);
        }

        setFilter(null);
        inputRef.current?.focus();
        setSelectedTags(newSelectedTags);

        if (props.debounceTimeMs) {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                props.onChange?.(newSelectedTags);
            }, props.debounceTimeMs);
        } else {
            props.onChange?.(newSelectedTags);
        }
    }

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        const newFilter = event.target.value.toLowerCase();
        setFilter(newFilter);
        const newFilteredOptions = props.tags.filter((option) =>
            option.label.toLowerCase().includes(newFilter.toLowerCase())
        );
        setFilteredTags(newFilteredOptions);
    }

    function handleClick() {
        setDropdownVisible(true);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }

    function removeTag(value: T) {
        setSelectedTags(selectedTags.filter((tag) => tag !== value));
        props.onChange?.(selectedTags.filter((tag) => tag !== value));
    }

    function handleClearAll() {
        setSelectedTags([]);
        props.onChange?.([]);
    }

    function handleFocus() {
        setFocused(true);
    }

    function handleBlur() {
        setFocused(false);
    }

    return (
        <BaseComponent disabled={props.disabled}>
            <div
                style={{ width: props.width }}
                id={props.wrapperId}
                ref={divRef}
                className={resolveClassNames("flex w-full border p-1 px-2 rounded text-sm shadow-sm input-comp", {
                    "outline outline-blue-500": focused,
                })}
                onClick={handleClick}
            >
                <div className="min-h-6 flex-grow flex gap-2 justify-start flex-wrap">
                    {selectedTags.map((tag) => {
                        const tagOption = props.tags.find((el) => el.value === tag);
                        if (!tagOption) {
                            return null;
                        }
                        return <Tag key={`${tag}`} tag={tagOption} onRemove={() => removeTag(tag)} />;
                    })}
                    <input
                        ref={inputRef}
                        className="flex-grow outline-none min-w-0 h-8 w-0"
                        onClick={handleInputClick}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        value={filter ?? ""}
                    />
                </div>
                <div className="h-8 flex flex-col justify-center cursor-pointer">
                    {selectedTags.length === 0 ? (
                        <ExpandMore fontSize="inherit" />
                    ) : (
                        <IconButton onClick={handleClearAll} title="Clear selection">
                            <Close fontSize="inherit" />
                        </IconButton>
                    )}
                </div>
            </div>
            {dropdownVisible &&
                createPortal(
                    <div
                        className="absolute bg-white border border-gray-300 rounded-md shadow-md overflow-y-auto z-50 box-border flex flex-col gap-1 p-1"
                        style={{ ...dropdownRect }}
                        ref={dropdownRef}
                    >
                        {filteredTags.length === 0 && (
                            <div className="p-1 flex items-center text-gray-400 select-none">
                                {props.tags.length === 0 || filter === "" ? NO_TAGS_TEXT : NO_MATCHING_TAGS_TEXT}
                            </div>
                        )}
                        <Virtualization
                            direction="vertical"
                            items={filteredTags}
                            itemSize={TAG_HEIGHT}
                            containerRef={dropdownRef}
                            startIndex={startIndex}
                            renderItem={(option) => (
                                <Checkbox
                                    key={option.value}
                                    checked={selectedTags.includes(option.value)}
                                    onChange={() => handleTagToggle(option.value)}
                                    label={option.label}
                                />
                            )}
                        />
                    </div>
                )}
        </BaseComponent>
    );
}

type TagProps<T> = {
    tag: TagOption<T>;
    onRemove: () => void;
};

function Tag<T>(props: TagProps<T>): React.ReactNode {
    return (
        <div className="bg-blue-200 p-1 pl-2 rounded flex gap-1 items-center input-comp">
            <span>{props.tag.label}</span>
            {
                <IconButton onClick={props.onRemove} title="Remove tag">
                    <Close fontSize="inherit" />
                </IconButton>
            }
        </div>
    );
}
