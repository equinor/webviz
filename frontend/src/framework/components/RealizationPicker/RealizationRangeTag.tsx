import React from "react";

import { Close, Error } from "@mui/icons-material";
import { Key } from "ts-key-enum";

import type { FocusableListItem } from "@lib/hooks/useListFocus";
import { Direction } from "@lib/hooks/useListFocus";
import { Button } from "@lib/newComponents/Button";
import { Separator } from "@lib/newComponents/Separator";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { RealizationNumberLimits, SelectionValidityInfo } from "./_utils";
import { computeTagValidityInfo, sanitizeRangeInput, SelectionValidity } from "./_utils";
import { AutoFitInput } from "./autoFitInput";

type RealizationRangeTagProps = FocusableListItem & {
    disabled?: boolean;
    realizationNumberLimits: RealizationNumberLimits;
    value: string;
    onChange: (newValue: string) => void;
    onRemove: () => void;
};

export function RealizationRangeTag(props: RealizationRangeTagProps): React.ReactNode {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // We only want to emit the changed value once we're done editing, to avoid re-renders as we type
    const [editingValue, setEditingValue] = React.useState<string | null>(null);
    const activeValue = editingValue ?? props.value;

    // If focus moved to this tag, move the focus into it's input field.
    React.useEffect(() => {
        if (!props.selected && props.focused && inputRef.current !== document.activeElement) {
            inputRef.current?.focus();
            const cursorPos = props.focusMovementDirection === Direction.Backwards ? props.value.length : 0;
            inputRef.current?.setSelectionRange(cursorPos, cursorPos);
        }
    }, [props.focusMovementDirection, props.focused, props.selected, props.value.length]);

    const validityInfo = React.useMemo<SelectionValidityInfo>(() => {
        return computeTagValidityInfo(props.value, props.realizationNumberLimits);
    }, [props.value, props.realizationNumberLimits]);

    const colorTone = React.useMemo<"danger" | "warning" | "neutral">(() => {
        if (validityInfo.validity === SelectionValidity.InputError) {
            return "danger";
        }
        if (validityInfo.validity === SelectionValidity.Invalid) {
            return "warning";
        }
        return "neutral";
    }, [validityInfo.validity]);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;

        const sanitizedValue = sanitizeRangeInput(value);

        setEditingValue(sanitizedValue);
    }

    function handleFocus() {
        setEditingValue(props.value);

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
            if (editingValue !== props.value) props.onChange?.(editingValue ?? "");
            setEditingValue(null);
        }
    }

    function handleKeyDown(evt: React.KeyboardEvent<HTMLInputElement>) {
        const target = evt.target as HTMLInputElement;

        const isSelecting = target.selectionStart !== target.selectionEnd;

        if (evt.key === Key.Enter || evt.key === ",") {
            commitEditValue();
            props.onMoveFocus?.(Direction.Forwards);
            evt.stopPropagation();
            evt.preventDefault();
        } else if (evt.key === Key.Backspace && editingValue === "") {
            props.onRemove?.();
        }

        // ? Used both here and in base picker comp. Should we move it to a utility function?
        else if (evt.key === Key.ArrowLeft && (target.selectionStart !== 0 || isSelecting)) {
            evt.stopPropagation();
        } else if (evt.key === Key.ArrowRight && (target.selectionEnd !== target.value.length || isSelecting)) {
            evt.stopPropagation();
        } else if (evt.key === Key.Backspace && props.value === "") {
            props.onRemove?.();
            evt.preventDefault();
            evt.stopPropagation();
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
        if (validityInfo.validity === SelectionValidity.InputError) {
            return <Error style={{ fontSize: 16 }} />;
        }

        if (validityInfo.numMatchedRealizations <= 1) {
            return null;
        }

        const allRealsMatched = validityInfo.numMatchedValidRealizations === validityInfo.numMatchedRealizations;

        const content = allRealsMatched
            ? validityInfo.numMatchedRealizations
            : `${validityInfo.numMatchedValidRealizations}/${validityInfo.numMatchedRealizations}`;

        const title = allRealsMatched
            ? `Matches ${validityInfo.numMatchedRealizations} realizations.`
            : `Matches ${validityInfo.numMatchedRealizations} realizations, but only ${validityInfo.numMatchedValidRealizations} are valid.`;

        return (
            <span
                className="text-info-strong-on-emphasis data-[tone=warning]:text-warning-strong bg-info-strong data-[tone=warning]:bg-warning-active px-xs rounded-lg font-light"
                title={title}
                data-tone={colorTone}
            >
                {content}
            </span>
        );
    }

    return (
        <li
            data-disabled={props.disabled ? "" : undefined}
            className={resolveClassNames(
                "relative rounded-sm",
                "flex items-center overflow-hidden",
                "pl-2xs",
                "data-disabled:opacity-75",
                "text-neutral-strong data-[tone=warning]:text-warning-subtle data-[tone=danger]:text-danger-subtle",
                "bg-neutral data-[tone=warning]:bg-warning data-[tone=danger]:bg-danger",
            )}
            data-tone={colorTone}
            title={tagTitle}
            onClick={props.onFocus}
        >
            {makeMatchCounter()}

            <AutoFitInput
                ref={inputRef}
                value={activeValue}
                aria-label="Range"
                type="text"
                disabled={props.selected || props.disabled}
                wrapperClassName="mx-3xs"
                className="focus:border-neutral-strong -mb-px border-b border-dashed border-transparent bg-transparent outline-hidden"
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
            />

            <Separator
                orientation="vertical"
                data-tone={colorTone}
                layoutClassName="bg-neutral-active data-[tone=warning]:bg-warning-active data-[tone=danger]:bg-danger-active mr-0!"
            />

            <Button
                tabIndex={-1}
                iconOnly
                size="small"
                tone={colorTone}
                disabled={props.selected || props.disabled}
                variant="ghost"
                onClick={(e) => {
                    e.stopPropagation();
                    props.onRemove();
                }}
            >
                <Close />
            </Button>

            {props.selected && (
                <div className="bg-accent-strong absolute top-0 left-0 z-10 block h-full w-full rounded-sm opacity-50" />
            )}
        </li>
    );
}

RealizationRangeTag.displayName = "RealizationRangeTag";
