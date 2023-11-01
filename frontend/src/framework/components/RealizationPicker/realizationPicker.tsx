import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { BaseComponent, BaseComponentProps } from "@lib/components/BaseComponent";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidthWithFont } from "@lib/utils/textSize";
import { Close } from "@mui/icons-material";

import { v4 } from "uuid";

type Selection = {
    uuid: string;
    value: string;
};

type RealizationRangeTagProps = {
    uuid: string;
    active: boolean;
    caretPosition?: "start" | "end";
    initialValue: string;
    onRemove: () => void;
    onFocus: () => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

const realizationRangeRegex = /^\d+(\-\d+)?$/;

function checkIfValueIsValid(value: string): boolean {
    if (!realizationRangeRegex.test(value)) {
        return false;
    }

    const range = value.split("-");
    if (range.length === 1) {
        return parseInt(range[0]) >= 1;
    } else if (range.length === 2) {
        return parseInt(range[0]) >= 1 && parseInt(range[1]) >= parseInt(range[0]);
    }

    return false;
}

const RealizationRangeTag: React.FC<RealizationRangeTagProps> = (props) => {
    const [valid, setValid] = React.useState<boolean>(checkIfValueIsValid(props.initialValue));
    const [value, setValue] = React.useState<string>(props.initialValue);
    const [hasFocus, setHasFocus] = React.useState<boolean>(false);

    const ref = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (props.active && ref.current) {
            ref.current.focus();
            if (props.caretPosition === "start") {
                ref.current.setSelectionRange(0, 0);
            } else {
                ref.current.setSelectionRange(value.length, value.length);
            }
        } else if (!props.active && ref.current) {
            ref.current.blur();
        }
    }, [props.active]);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        if (checkIfValueIsValid(value)) {
            setValid(true);
        } else {
            setValid(false);
        }
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        e.stopPropagation();
        props.onFocus();
        setHasFocus(true);
    }

    return (
        <li
            className={resolveClassNames("flex items-center rounded px-2 py-1 mr-1 text-sm", {
                "bg-blue-200": !hasFocus,
                "bg-red-300": !valid && !hasFocus,
                "outline outline-blue-600": hasFocus,
            })}
            title={valid ? undefined : "Invalid value"}
        >
            <input
                ref={ref}
                className="bg-transparent outline-none"
                style={{ width: getTextWidthWithFont(value, "normal 16px sans-serif") }}
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

export type RealizationPickerProps = {
    ensembleIdents: EnsembleIdent[];
    onChange?: (selectedRealizations: number[]) => void;
} & BaseComponentProps;

export const RealizationPicker: React.FC<RealizationPickerProps> = (props) => {
    const [selections, setSelections] = React.useState<Selection[]>([]);
    const [activeSelectionUuid, setActiveSelectionUuid] = React.useState<string | null>(null);
    const [caretPosition, setCaretPosition] = React.useState<"start" | "end">("end");

    const debounceTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    function calcUniqueSelections(): number[] {
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
        return Array.from(uniqueSelections).sort((a, b) => a - b);
    }

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setSelections((selections) => [...selections, { value, uuid: v4() }]);
        setActiveSelectionUuid(null);
        event.target.value = "";
    }

    function handlePointerDown() {
        if (inputRef.current) {
            inputRef.current.focus();
            setActiveSelectionUuid(null);
        }
    }

    function handleRemove(uuid: string) {
        setSelections((selections) => selections.filter((selection) => selection.uuid !== uuid));
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        const eventTarget = event.target as HTMLInputElement;

        const allowedChars = "0123456789-,";
        if (event.key === "Backspace" && event.currentTarget.value === "") {
            const lastSelection = selections[selections.length - 1];
            if (lastSelection) {
                setSelections((selections) => selections.slice(0, -1));
            }
            if (inputRef.current) {
                inputRef.current.value = lastSelection?.value || "";
            }
            event.preventDefault();
        } else if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            handleChange(event as any);
        } else if (event.key === "Backspace") {
            return;
        } else if (event.key === "ArrowLeft") {
            if (eventTarget.selectionStart === 0 && eventTarget.selectionEnd === 0) {
                let currentSelectionIndex = selections.findIndex((selection) => selection.uuid === activeSelectionUuid);
                if (activeSelectionUuid === null) {
                    currentSelectionIndex = selections.length;
                }
                if (currentSelectionIndex > 0) {
                    setActiveSelectionUuid(selections[currentSelectionIndex - 1].uuid);
                    setCaretPosition("end");
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
                    setCaretPosition("start");
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

    function clearSelections() {
        setSelections([]);
        setActiveSelectionUuid(null);
    }

    const numSelectedRealizations = calcUniqueSelections().length;

    return (
        <BaseComponent disabled={props.disabled}>
            <div className="relative border border-gray-300 rounded p-2 pr-6">
                <ul className="flex flex-wrap items-center cursor-text gap-1" onPointerDown={handlePointerDown}>
                    {selections.map((selection) => (
                        <RealizationRangeTag
                            uuid={selection.uuid}
                            active={selection.uuid === activeSelectionUuid}
                            caretPosition={caretPosition}
                            key={selection.uuid}
                            initialValue={selection.value}
                            onRemove={() => handleRemove(selection.uuid)}
                            onFocus={() => setActiveSelectionUuid(selection.uuid)}
                            onKeyDown={handleKeyDown}
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
