import React from "react";

import { BaseComponent, BaseComponentProps } from "@lib/components/BaseComponent";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidthWithFont } from "@lib/utils/textSize";
import { Close } from "@mui/icons-material";

import { isEqual } from "lodash";
import { v4 } from "uuid";

enum SelectionValidity {
    Valid = "valid",
    InputError = "inputError",
    Invalid = "invalid",
}

enum CaretPosition {
    Start = "start",
    End = "end",
}

type Selection = {
    uuid: string;
    value: string;
};

type SelectionValidityInfo = {
    validity: SelectionValidity;
    numMatchedRealizations: number;
    numMatchedValidRealizations: number;
};

type RealizationRangeTagProps = {
    uuid: string;
    active: boolean;
    caretPosition?: CaretPosition;
    initialValue: string;
    checkValidity: (value: string) => SelectionValidityInfo;
    validRealizations?: readonly number[];
    onChange: (value: string) => void;
    onRemove: () => void;
    onFocus: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

const REALIZATION_RANGE_REGEX = /^\d+(-\d+)?$/;

const RealizationRangeTag: React.FC<RealizationRangeTagProps> = (props) => {
    const [prevValidRealizations, setPrevValidRealizations] = React.useState<typeof props.validRealizations | null>(
        null
    );
    const [validityInfo, setValidityInfo] = React.useState<SelectionValidityInfo>(
        props.checkValidity(props.initialValue)
    );
    const [value, setValue] = React.useState<string>(props.initialValue);
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);

    const ref = React.useRef<HTMLInputElement>(null);

    if (prevValidRealizations !== props.validRealizations) {
        setPrevValidRealizations(props.validRealizations);
        setValidityInfo(props.checkValidity(value));
    }

    React.useEffect(() => {
        if (props.active && ref.current) {
            ref.current.focus();
            if (props.caretPosition === CaretPosition.Start) {
                ref.current.setSelectionRange(0, 0);
            } else {
                ref.current.setSelectionRange(value.length, value.length);
            }
        } else if (!props.active && ref.current) {
            ref.current.blur();
        }
    }, [props.active, props.caretPosition, value]);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setValidityInfo(props.checkValidity(value));
        props.onChange(value);
        setValue(value);
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        e.stopPropagation();
        props.onFocus();
        setHasFocus(true);
    }

    function makeTitle(): string | undefined {
        if (validityInfo.validity === SelectionValidity.InputError) {
            return "Invalid input";
        } else if (validityInfo.validity === SelectionValidity.Invalid) {
            return "This value is not valid for the selected ensemble(s).";
        }
        return undefined;
    }

    function makeMatchCounter(): React.ReactNode {
        if (validityInfo.numMatchedRealizations <= 1) {
            return null;
        }

        if (validityInfo.numMatchedValidRealizations === validityInfo.numMatchedRealizations) {
            return (
                <span
                    className="rounded-lg bg-white text-xs mr-2 p-1 font-semibold"
                    title={`Matches ${validityInfo.numMatchedRealizations} realizations.`}
                >
                    {validityInfo.numMatchedRealizations}
                </span>
            );
        }

        return (
            <span
                className="rounded-lg bg-white text-xs mr-2 p-0.5 font-semibold"
                title={`Matches ${validityInfo.numMatchedRealizations} realizations, but only ${validityInfo.numMatchedValidRealizations} are valid.`}
            >
                {validityInfo.numMatchedValidRealizations}/{validityInfo.numMatchedRealizations}
            </span>
        );
    }

    return (
        <li
            className={resolveClassNames("flex items-center rounded px-2 py-0.5 mr-1", {
                "bg-blue-200": !hasFocus,
                "bg-red-300": validityInfo.validity === SelectionValidity.InputError && !hasFocus,
                "bg-orange-300": validityInfo.validity === SelectionValidity.Invalid && !hasFocus,
                "outline outline-blue-600": hasFocus,
            })}
            title={makeTitle()}
        >
            {makeMatchCounter()}
            <input
                ref={ref}
                className="bg-transparent outline-none"
                style={{ width: getTextWidthWithFont(value, "Equinor", 1.25) }}
                type="text"
                defaultValue={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={() => setHasFocus(false)}
                onKeyDown={props.onKeyDown}
            />
            <div
                className={resolveClassNames(
                    "text-slate-800 hover:text-slate-600 text-sm cursor-pointer flex items-center",
                    {
                        invisible: hasFocus,
                    }
                )}
                onClick={props.onRemove}
            >
                <Close fontSize="inherit" />
            </div>
        </li>
    );
};

RealizationRangeTag.displayName = "RealizationRangeTag";

function calcUniqueSelections(selections: readonly Selection[], validRealizations?: readonly number[]): number[] {
    const uniqueSelections = new Set<number>();
    selections.forEach((selection) => {
        const range = selection.value.split("-");
        if (range.length === 1) {
            uniqueSelections.add(parseInt(range[0]));
        } else if (range.length === 2) {
            for (let i = parseInt(range[0]); i <= parseInt(range[1]); i++) {
                uniqueSelections.add(i);
            }
        }
    });

    let uniqueSelectionsArray = Array.from(uniqueSelections);

    if (validRealizations) {
        uniqueSelectionsArray = uniqueSelectionsArray.filter((realization) => validRealizations.includes(realization));
    }

    return uniqueSelectionsArray.sort((a, b) => a - b);
}

export type RealizationPickerSelection = {
    selectedRealizations: number[];
    selectedRangeTags: string[];
};

export type RealizationPickerProps = {
    selectedRangeTags?: readonly string[];
    initialRangeTags?: readonly string[];
    validRealizations?: readonly number[];
    debounceTimeMs?: number;
    onChange?: (realizationPickerSelection: RealizationPickerSelection) => void;
} & BaseComponentProps;

export const RealizationPicker: React.FC<RealizationPickerProps> = (props) => {
    const [selections, setSelections] = React.useState<Selection[]>(
        props.initialRangeTags
            ? [...props.initialRangeTags].map((rangeTag) => {
                  return { value: rangeTag, uuid: v4() };
              })
            : []
    );
    const [activeSelectionUuid, setActiveSelectionUuid] = React.useState<string | null>(null);
    const [caretPosition, setCaretPosition] = React.useState<CaretPosition>(CaretPosition.End);
    const [prevSelectedRangeTags, setPrevSelectedRangeTags] = React.useState<string[]>(
        props.selectedRangeTags ? [...props.selectedRangeTags] : []
    );

    const debounceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    if (props.selectedRangeTags !== undefined && !isEqual(props.selectedRangeTags, prevSelectedRangeTags)) {
        const newSelections =
            props.selectedRangeTags?.map((rangeTag) => {
                return { value: rangeTag, uuid: v4() };
            }) ?? [];
        setSelections(newSelections);
        setPrevSelectedRangeTags(props.selectedRangeTags ? [...props.selectedRangeTags] : []);
    }

    const checkValidity = React.useCallback(
        function checkValidity(value: string): SelectionValidityInfo {
            if (!REALIZATION_RANGE_REGEX.test(value)) {
                return {
                    validity: SelectionValidity.InputError,
                    numMatchedRealizations: 0,
                    numMatchedValidRealizations: 0,
                };
            }

            const range = value.split("-");
            if (range.length === 1) {
                if (parseInt(range[0]) < 0) {
                    return {
                        validity: SelectionValidity.InputError,
                        numMatchedRealizations: 0,
                        numMatchedValidRealizations: 0,
                    };
                }
                if (props.validRealizations) {
                    if (!props.validRealizations.includes(parseInt(range[0]))) {
                        return {
                            validity: SelectionValidity.Invalid,
                            numMatchedRealizations: 1,
                            numMatchedValidRealizations: 0,
                        };
                    }
                }
                return {
                    validity: SelectionValidity.Valid,
                    numMatchedRealizations: 1,
                    numMatchedValidRealizations: 1,
                };
            } else if (range.length === 2) {
                if (parseInt(range[0]) < 0 || parseInt(range[1]) <= parseInt(range[0])) {
                    return {
                        validity: SelectionValidity.InputError,
                        numMatchedRealizations: 0,
                        numMatchedValidRealizations: 0,
                    };
                }
                const numMatches = parseInt(range[1]) - parseInt(range[0]) + 1;
                if (props.validRealizations) {
                    let numNotValid = 0;
                    for (let i = parseInt(range[0]); i <= parseInt(range[1]); i++) {
                        if (!props.validRealizations.includes(i)) {
                            numNotValid++;
                        }
                    }
                    if (numNotValid > 0) {
                        return {
                            validity: SelectionValidity.Invalid,
                            numMatchedRealizations: numMatches,
                            numMatchedValidRealizations: numMatches - numNotValid,
                        };
                    }
                }
                return {
                    validity: SelectionValidity.Valid,
                    numMatchedRealizations: numMatches,
                    numMatchedValidRealizations: numMatches,
                };
            }

            return {
                validity: SelectionValidity.Valid,
                numMatchedRealizations: 1,
                numMatchedValidRealizations: 1,
            };
        },
        [props.validRealizations]
    );

    function handleSelectionsChange(newSelections: Selection[]) {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            if (props.onChange) {
                props.onChange({
                    selectedRealizations: calcUniqueSelections(newSelections, props.validRealizations),
                    selectedRangeTags: newSelections.map((selection) => selection.value),
                });
            }
        }, props.debounceTimeMs || 0);
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        const newSelections = [...selections, { value, uuid: v4() }];
        setSelections(newSelections);
        setActiveSelectionUuid(null);
        event.target.value = "";
        handleSelectionsChange(newSelections);
    }

    function handlePointerDown() {
        if (inputRef.current) {
            setActiveSelectionUuid(null);
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.setSelectionRange(inputRef.current?.value.length, inputRef.current?.value.length);
            }, 500);
        }
    }

    function handleRemove(uuid: string) {
        const newSelections = selections.filter((selection) => selection.uuid !== uuid);
        setSelections(newSelections);
        handleSelectionsChange(newSelections);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        const eventTarget = event.target as HTMLInputElement;

        const allowedChars = "0123456789-,";
        if (event.key === "Backspace" && event.currentTarget.value === "") {
            const lastSelection = selections[selections.length - 1];
            if (lastSelection) {
                const newSelections = selections.slice(0, -1);
                setSelections(newSelections);
            }
            if (inputRef.current) {
                inputRef.current.value = lastSelection?.value || "";
            }
            event.preventDefault();
        } else if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            handleChange(event as any);
        } else if (event.key === "Backspace" || event.key === "Delete" || event.key === "Home" || event.key === "End") {
            return;
        } else if (event.key === "ArrowLeft") {
            if (eventTarget.selectionStart === 0 && eventTarget.selectionEnd === 0) {
                let currentSelectionIndex = selections.findIndex((selection) => selection.uuid === activeSelectionUuid);
                if (activeSelectionUuid === null) {
                    currentSelectionIndex = selections.length;
                }
                if (currentSelectionIndex > 0) {
                    setActiveSelectionUuid(selections[currentSelectionIndex - 1].uuid);
                    setCaretPosition(CaretPosition.End);
                }
                event.preventDefault();
            }
        } else if (event.key === "ArrowRight") {
            if (
                eventTarget.selectionStart === eventTarget.value.length &&
                eventTarget.selectionEnd === eventTarget.value.length
            ) {
                const currentSelectionIndex = selections.findIndex(
                    (selection) => selection.uuid === activeSelectionUuid
                );
                if (currentSelectionIndex !== -1 && currentSelectionIndex < selections.length - 1) {
                    setActiveSelectionUuid(selections[currentSelectionIndex + 1].uuid);
                    setCaretPosition(CaretPosition.Start);
                } else {
                    setActiveSelectionUuid(null);
                    inputRef.current?.focus();
                    inputRef.current?.setSelectionRange(0, 0);
                }
                event.preventDefault();
            }
        } else if (!allowedChars.includes(event.key)) {
            event.preventDefault();
        }
    }

    function handleTagValueChange(uuid: string, value: string) {
        const newSelections = selections.map((selection) => {
            if (selection.uuid === uuid) {
                return { ...selection, value };
            }
            return selection;
        });
        setSelections(newSelections);
        handleSelectionsChange(newSelections);
    }

    function clearSelections() {
        setSelections([]);
        setActiveSelectionUuid(null);
        handleSelectionsChange([]);
    }

    const numSelectedRealizations = calcUniqueSelections(selections, props.validRealizations).length;

    return (
        <BaseComponent disabled={props.disabled}>
            <div className="relative border border-gray-300 rounded p-2 pr-6 min-h-[3rem]">
                <ul className="flex flex-wrap items-center cursor-text gap-1 h-full" onPointerDown={handlePointerDown}>
                    {selections.map((selection) => (
                        <RealizationRangeTag
                            key={selection.uuid}
                            uuid={selection.uuid}
                            active={selection.uuid === activeSelectionUuid}
                            caretPosition={caretPosition}
                            initialValue={selection.value}
                            checkValidity={checkValidity}
                            validRealizations={props.validRealizations}
                            onRemove={() => handleRemove(selection.uuid)}
                            onFocus={() => setActiveSelectionUuid(selection.uuid)}
                            onKeyDown={handleKeyDown}
                            onChange={(value) => handleTagValueChange(selection.uuid, value)}
                        />
                    ))}
                    <li className="flex-grow flex">
                        <input
                            ref={inputRef}
                            type="text"
                            className="outline-none flex-grow"
                            onKeyDown={handleKeyDown}
                        />
                    </li>
                </ul>
                <div
                    className="absolute right-2 top-1/2 -mt-3 h-6 w-4 text-sm text-slate-800 hover:text-slate-600 cursor-pointer"
                    onClick={clearSelections}
                    title="Clear selection"
                >
                    <Close fontSize="inherit" />
                </div>
            </div>
            <div className="text-sm text-gray-500 text-right mt-2">
                {numSelectedRealizations} realization{numSelectedRealizations === 1 ? "" : "s"} selected
            </div>
        </BaseComponent>
    );
};

RealizationPicker.displayName = "RealizationPicker";
