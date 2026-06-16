import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";
import type { ComboboxRootProps } from "@base-ui/react";
import { Clear, UnfoldMore } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import type { SelectableSize } from "../_shared/utils/size";
import { SELECTABLE_SIZES_CLASSNAMES } from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";
import { CircularProgress } from "../CircularProgress";

import { ComboboxListGroup } from "./_components/group";
import { ComboboxSingleValueInput } from "./_components/inputVariants/singleValueInput";
import { ComboboxValueChipsInput } from "./_components/inputVariants/valueChipsInput";
import { ComboboxValueCountInput } from "./_components/inputVariants/valueCountInput";
import { ComboboxListItem } from "./_components/item";
import { ComboBoxPopup } from "./_components/popup";
import type { AsyncState, ComboboxGroup, ComboboxItem, ComboboxItems } from "./types";

function isGroupedItems<TValue>(items: ComboboxItems<TValue> | undefined): items is ComboboxGroup<TValue>[] {
    return Array.isArray(items) && items.length > 0 && "items" in Object(items[0]);
}

export type ComboboxProps<TValue, TMultiple extends boolean | undefined = false> = ComponentWrapperProps<
    Omit<
        ComboboxRootProps<TValue, TMultiple>,
        "items" | "itemToStringLabel" | "itemToStringValue" | "isItemEqualToValue"
    >
> &
    AsyncState & {
        items: ComboboxItems<TValue>;
        placeholder?: string;
        noMatchesText?: React.ReactNode;
        showClearAllButton?: boolean;
        /** startAdornment is shown at the start of the component */
        startAdornment?: React.ReactNode;
        /** endAdornment is shown instead of the trigger icon at the end of the input - only when `multiple` is false */
        endAdornment?: React.ReactNode;
        renderItemAdornment?: (item: TValue) => React.ReactNode;
        /** Only applies when `multiple` is true. "chips" (default) renders a chip per selection; "count" renders "X/N selected". */
        selectionMode?: "chips" | "count";
        size?: SelectableSize;
    };

function getItemValueKey<TValue>(item: TValue): React.Key {
    return (item as any).value ?? String(item);
}

function ComboboxComponent<TValue, TMultiple extends boolean | undefined = false>(
    props: ComboboxProps<TValue, TMultiple>,
    ref: React.ForwardedRef<HTMLInputElement>,
) {
    const {
        placeholder = "Select an option",
        noMatchesText = "No matches found",
        loadingText = (
            <span className="gap-x-sm flex items-center">
                <CircularProgress size={16} />
                Loading options
            </span>
        ),
        showClearAllButton = false,
        renderItemAdornment,
        selectionMode = "chips",
        ...rest
    } = props;
    const baseProps = resolveWrapperProps(rest, "items", "loading", "errorText", "size");

    const hasGroups = isGroupedItems(props.items);
    const size = useComponentSize(props);

    const flatItems = React.useMemo(() => {
        if (isGroupedItems(props.items)) {
            return props.items.flatMap<ComboboxItem<TValue>>((g) => g.items);
        }
        return props.items;
    }, [props.items]);

    const baseItems = React.useMemo(() => {
        if (isGroupedItems(props.items)) {
            return props.items.map((group) => ({
                ...group,
                items: group.items.map((item) => item.value),
            }));
        }

        return props.items.map((item) => item.value);
    }, [props.items]);

    const itemByValue = React.useMemo(() => {
        return new Map(flatItems.map((item) => [item.value, item]));
    }, [flatItems]);

    function getLabelForValue(value: TValue): string {
        return itemByValue.get(value)?.label ?? String(value);
    }

    function renderValueItem(value: TValue) {
        const item = itemByValue.get(value as TValue);
        if (!item) return null;

        return (
            <ComboboxListItem
                key={getItemValueKey(item)}
                item={item}
                isMultiSelect={props.multiple}
                renderItemAdornment={renderItemAdornment}
            />
        );
    }

    return (
        <ComboboxBase.Root
            items={baseItems}
            itemToStringLabel={(value) => getLabelForValue(value as unknown as TValue)}
            {...baseProps}
        >
            <ComboboxBase.InputGroup
                className={resolveClassNames(
                    props.layoutClassName,
                    "form-element gap-x-sm pl-sm flex cursor-text items-center",
                    size !== "small" || (props.multiple && selectionMode === "chips") ? "py-xs" : undefined,
                    SELECTABLE_SIZES_CLASSNAMES[size],
                )}
            >
                {props.startAdornment && <div className="flex shrink-0 items-center">{props.startAdornment}</div>}
                {/* --- Input variants --- */}
                {props.multiple && selectionMode === "chips" && (
                    <ComboboxValueChipsInput
                        ref={ref}
                        getLabelForValue={getLabelForValue}
                        renderItemAdornment={renderItemAdornment}
                        placeholder={placeholder}
                    />
                )}
                {props.multiple && selectionMode === "count" && (
                    <ComboboxValueCountInput ref={ref} flatItems={flatItems} placeholder={props.placeholder} />
                )}
                {!props.multiple && (
                    <ComboboxSingleValueInput
                        ref={ref}
                        renderItemAdornment={renderItemAdornment}
                        placeholder={placeholder}
                    />
                )}

                {/* --- Controls --- */}
                <div className="pr-xs gap-selectable box-border flex h-full shrink-0 items-center justify-center">
                    {showClearAllButton && (
                        <ComboboxBase.Clear
                            className="Clear selectable text-body-sm py-3xs! box-border flex items-center justify-center"
                            aria-label="Clear selection"
                        >
                            <Clear fontSize="inherit" />
                        </ComboboxBase.Clear>
                    )}
                    {(!props.multiple || selectionMode === "count") && !props.endAdornment && (
                        <ComboboxBase.Trigger
                            className="box-border flex items-center justify-center"
                            aria-label="Open options"
                        >
                            <UnfoldMore fontSize="inherit" />
                        </ComboboxBase.Trigger>
                    )}
                    {props.endAdornment && <div className="flex items-center">{props.endAdornment}</div>}
                </div>
            </ComboboxBase.InputGroup>

            <ComboBoxPopup itemSize={size}>
                <ComboboxBase.Status className="sr-only">
                    {props.loading ? loadingText : props.errorText}
                </ComboboxBase.Status>

                {props.errorText ? (
                    <div className="p-selectable italic">{props.errorText}</div>
                ) : (
                    <React.Fragment>
                        <ComboboxBase.Empty>
                            <div className="p-selectable italic">{props.loading ? loadingText : noMatchesText}</div>
                        </ComboboxBase.Empty>

                        <ComboboxBase.List>
                            {hasGroups
                                ? (group) => (
                                      <React.Fragment key={group.value}>
                                          <ComboboxBase.Separator className="menu__separator" />
                                          <ComboboxListGroup group={group}>{renderValueItem}</ComboboxListGroup>
                                      </React.Fragment>
                                  )
                                : renderValueItem}
                        </ComboboxBase.List>
                    </React.Fragment>
                )}
            </ComboBoxPopup>
        </ComboboxBase.Root>
    );
}

export const Combobox = React.forwardRef(ComboboxComponent as any) as <
    TValue,
    TMultiple extends boolean | undefined = false,
>(
    props: ComboboxProps<TValue, TMultiple> & {
        ref?: React.Ref<HTMLInputElement>;
    },
) => React.ReactElement;
