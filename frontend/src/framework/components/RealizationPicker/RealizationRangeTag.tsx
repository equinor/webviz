import React from "react";

import { Close } from "@mui/icons-material";
import { Key } from "ts-key-enum";

import { Direction, type TagProps } from "@lib/components/TagInput";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { getTextWidthWithFont } from "@lib/utils/textSize";

import type { RealizationNumberLimits, SelectionValidityInfo } from "./_utils";
import { computeTagValidityInfo, sanitizeRangeInput, SelectionValidity } from "./_utils";

type RealizationRangeTagProps = TagProps & {
    realizationNumberLimits: RealizationNumberLimits;
};

export function RealizationRangeTag(props: RealizationRangeTagProps): React.ReactNode {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // We only want to emit the changed value once we're done editing, to avoid re-renders as we type
    const [editingValue, setEditingValue] = React.useState<string | null>(null);
    const activeValue = editingValue ?? props.tag.value;

    // If focus moved to this tag, move the focus into it's input field.
    React.useEffect(() => {
        if (props.focused) {
            inputRef.current?.focus();
            const cursorPos = props.focusMovementDirection === Direction.Backwards ? props.tag.value.length : 0;
            inputRef.current?.setSelectionRange(cursorPos, cursorPos);
        }
    }, [props.focusMovementDirection, props.focused, props.tag.value.length]);

    const validityInfo = React.useMemo<SelectionValidityInfo>(() => {
        return computeTagValidityInfo(props.tag.value, props.realizationNumberLimits);
    }, [props.tag.value, props.realizationNumberLimits]);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;

        const sanitizedValue = sanitizeRangeInput(value);

        setEditingValue(sanitizedValue);
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        setEditingValue(props.tag.value);

        e.stopPropagation();

        if (!props.focused) {
            props.onFocus?.();
        }
    }

    function handleBlur() {
        commitEditValue();
    }

    function commitEditValue() {
        if (editingValue === null) return;

        if (editingValue === "") {
            props.onRemove?.();
        } else {
            props.onChange?.({ ...props.tag, value: editingValue ?? "" });
            setEditingValue(null);
        }
    }

    function handleKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
        evt.stopPropagation();

        const target = evt.target as HTMLInputElement;

        const isSelecting = target.selectionStart !== target.selectionEnd;

        if (evt.key === Key.Enter || evt.key === props.separator || evt.key === Key.Tab) {
            commitEditValue();
            props.onMoveFocus?.(Direction.Forwards);
            evt.preventDefault();
        } else if (evt.key === Key.Backspace && editingValue === "") {
            props.onRemove?.();
        }

        // ? Used both here and in base picker comp. Should we move it to a utility function?
        else if (evt.key === Key.ArrowLeft && target.selectionStart === 0 && !isSelecting) {
            props.onMoveFocus?.(Direction.Backwards, evt.shiftKey);
            evt.preventDefault();
        } else if (evt.key === Key.ArrowRight && target.selectionEnd === target.value.length && !isSelecting) {
            props.onMoveFocus?.(Direction.Forwards, evt.shiftKey);
            evt.preventDefault();
        } else if (evt.key === Key.Backspace && props.tag.value === "") {
            props.onRemove?.();
            evt.preventDefault();
        }
    }

    const tagTitle = React.useMemo(() => {
        if (validityInfo.validity === SelectionValidity.InputError) {
            return "Invalid input";
        } else if (validityInfo.validity === SelectionValidity.Invalid) {
            return "This value is not valid for ensemble.";
        }
        return undefined;
    }, [validityInfo.validity]);

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
            className={resolveClassNames("flex items-center rounded-sm px-2 py-0.5 relative", {
                "bg-blue-200": !props.focused,
                "bg-red-300": validityInfo.validity === SelectionValidity.InputError && !props.focused,
                "bg-orange-300": validityInfo.validity === SelectionValidity.Invalid && !props.focused,
                "outline outline-blue-600": props.focused || props.selected,
            })}
            title={tagTitle}
            onClick={() => inputRef.current?.focus()}
        >
            {makeMatchCounter()}
            <input
                ref={inputRef}
                value={activeValue}
                type="text"
                className="bg-transparent outline-hidden"
                style={{ width: getTextWidthWithFont(activeValue, "Equinor", 1.25) }}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
            />
            <div
                tabIndex={-1}
                className={resolveClassNames(
                    "text-slate-800 hover:text-slate-600 text-sm cursor-pointer flex items-center",
                    {
                        invisible: props.focused,
                    },
                )}
                onClick={props.onRemove}
            >
                <Close fontSize="inherit" />
            </div>

            {props.selected && (
                <div className="bg-blue-800 opacity-30 absolute left-0 top-0 w-full h-full block z-10 rounded-sm" />
            )}
        </li>
    );
}

RealizationRangeTag.displayName = "RealizationRangeTag";
