import React from "react";

import { Combobox as ComboboxBase } from "@base-ui/react";
import type { ComboboxRootProps } from "@base-ui/react";
import { Clear, Error, ExpandMore } from "@mui/icons-material";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import { withDefaults } from "../_shared/utils/defaultProps";
import type { SelectableSize } from "../_shared/utils/size";
import { SELECTABLE_SIZES_CLASSNAMES } from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";
import { Button } from "../Button";
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
        /** The list of items or grouped items to display in the dropdown. */
        items: ComboboxItems<TValue>;
        /** Content shown when no items match the current search input. @default "No matches found" */
        noMatchesText?: React.ReactNode;
        /** When true, shows a button to clear the entire selection. @default false */
        showClearAllButton?: boolean;
        /** Element shown at the start of the input. */
        startAdornment?: React.ReactNode;
        /** Element shown at the end of the input instead of the trigger icon. Only applies when `multiple` is false. */
        endAdornment?: React.ReactNode;
        /** Optional function to render an adornment alongside each item in the dropdown list. */
        renderItemAdornment?: (item: TValue) => React.ReactNode;
        /**
         * Explanation shown (as tooltip and accessible description) for selected values that are unavailable.
         * By default a value is unavailable when it is not among `items`; see `isValueAvailable` to override this.
         * Unavailable values are marked as such, and the field is marked invalid when no selected value is available.
         * Keep `items` populated while loading to avoid false marking, or provide `isValueAvailable` if `items` is partial.
         * @default "Not available"
         */
        unavailableValueText?: string;
        /**
         * Label for selected values that are not in `items`, regardless of `isValueAvailable`.
         * Needed when `items` is partial, as such values have no item to take a label from. @default String(value)
         */
        getUnavailableValueLabel?: (value: TValue) => string;
        /**
         * Decides whether a selected value is available. Overrides the default check (value is among `items`).
         * Use when `items` is a partial list, e.g. server-side filtered; `() => true` never marks values as unavailable.
         * Memoize the function (e.g. `useCallback`) to avoid recomputing the dropdown list on every render.
         */
        isValueAvailable?: (value: TValue) => boolean;
        /** Size of the combobox input. @default "default" */
        size?: SelectableSize;
        /** Only applies when `multiple` is true. @default "chips" */
        selectionMode?: "chips" | "count";
        /** Placeholder text shown when no value is selected. Not applicable in count selection mode. @default "Select an option" */
        placeholder?: string;
    };

function getItemValueKey<TValue>(item: TValue): React.Key {
    return (item as any).value ?? String(item);
}

const UNAVAILABLE_GROUP_KEY = "__unavailable__";

const DEFAULT_PROPS = {
    placeholder: "Select an option",
    noMatchesText: "No matches found",
    loadingText: (
        <span className="gap-x-sm flex items-center">
            <CircularProgress size={16} />
            Loading options
        </span>
    ),
    showClearAllButton: false,
    selectionMode: "chips",
    unavailableValueText: "Not available",
} satisfies Partial<ComboboxProps<any, any>>;

function ComboboxComponent<TValue, TMultiple extends boolean | undefined = false>(
    props: ComboboxProps<TValue, TMultiple>,
    ref: React.ForwardedRef<HTMLInputElement>,
) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);

    const baseProps = resolveWrapperProps(
        defaultedProps,
        "renderItemAdornment",
        "unavailableValueText",
        "getUnavailableValueLabel",
        "isValueAvailable",
        "placeholder",
        "noMatchesText",
        "loadingText",
        "showClearAllButton",
        "selectionMode",
        "startAdornment",
        "endAdornment",
        "items",
        "loading",
        "errorText",
        "size",
    );

    const size = useComponentSize(props);

    // Mirrors the value also when uncontrolled; needed to list unavailable selected values in multi-select modes
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultedProps.defaultValue);
    const currentValue = defaultedProps.value !== undefined ? defaultedProps.value : uncontrolledValue;

    const handleValueChange: typeof defaultedProps.onValueChange = function handleValueChange(value, eventDetails) {
        setUncontrolledValue(value);
        defaultedProps.onValueChange?.(value, eventDetails);
    };

    const flatItems = React.useMemo(() => {
        if (isGroupedItems(defaultedProps.items)) {
            return defaultedProps.items.flatMap<ComboboxItem<TValue>>((g) => g.items);
        }
        return defaultedProps.items;
    }, [defaultedProps.items]);

    const itemByValue = React.useMemo(() => {
        return new Map(flatItems.map((item) => [item.value, item]));
    }, [flatItems]);

    // Single source of truth for availability; used for highlighting, validity and the unavailable group alike
    const { isValueAvailable: isValueAvailableProp } = defaultedProps;
    const isValueAvailable = React.useCallback(
        function isValueAvailable(value: TValue): boolean {
            return isValueAvailableProp ? isValueAvailableProp(value) : itemByValue.has(value);
        },
        [isValueAvailableProp, itemByValue],
    );

    // Unavailable selected values are listed in the dropdown (in both multi-select modes) so they can be unselected there
    const unavailableListValues = React.useMemo(() => {
        if (!defaultedProps.multiple || !Array.isArray(currentValue)) {
            return [];
        }
        return (currentValue as TValue[]).filter((value) => !itemByValue.has(value) && !isValueAvailable(value));
    }, [defaultedProps.multiple, currentValue, itemByValue, isValueAvailable]);

    const baseItems = React.useMemo(() => {
        const items = defaultedProps.items;
        if (!isGroupedItems(items) && unavailableListValues.length === 0) {
            return items.map((item) => item.value);
        }

        const groups = isGroupedItems(items) ? items : [{ value: "", items }];
        const baseGroups = groups.map((group) => ({ ...group, items: group.items.map((item) => item.value) }));
        if (unavailableListValues.length > 0) {
            // Placed first so they are visible without scrolling in long lists
            baseGroups.unshift({ value: UNAVAILABLE_GROUP_KEY, items: unavailableListValues });
        }
        return baseGroups;
    }, [defaultedProps.items, unavailableListValues]);

    const hasGroups = isGroupedItems(defaultedProps.items) || unavailableListValues.length > 0;

    function getLabelForValue(value: TValue): string {
        const item = itemByValue.get(value);
        if (item) {
            return item.label;
        }
        return defaultedProps.getUnavailableValueLabel?.(value) ?? String(value);
    }

    function hasOnlyUnavailableValues(value: unknown): boolean {
        const values = defaultedProps.multiple && Array.isArray(value) ? value : value == null ? [] : [value];
        return values.length > 0 && values.every((v) => !isValueAvailable(v as TValue));
    }

    function renderValueItem(value: TValue) {
        const item = itemByValue.get(value as TValue) ?? { value, label: getLabelForValue(value) };

        return (
            <ComboboxListItem
                key={getItemValueKey(item)}
                item={item}
                isMultiSelect={defaultedProps.multiple}
                renderItemAdornment={defaultedProps.renderItemAdornment}
            />
        );
    }

    return (
        <ComboboxBase.Root
            {...baseProps}
            onValueChange={handleValueChange}
            items={baseItems}
            itemToStringLabel={(value) => getLabelForValue(value as unknown as TValue)}
        >
            <ComboboxBase.InputGroup
                render={(htmlProps, state) => {
                    const { children, className, ...divProps } = htmlProps;
                    return (
                        <ComboboxBase.Value>
                            {(value) => (
                                <div
                                    {...divProps}
                                    {...(hasOnlyUnavailableValues(value) && { "data-invalid": "" })}
                                    className={resolveClassNames(
                                        className,
                                        baseProps.className,
                                        "form-element gap-x-sm px-sm flex cursor-text items-center",
                                        size !== "small" ||
                                            (defaultedProps.multiple && defaultedProps.selectionMode === "chips")
                                            ? "py-2xs"
                                            : undefined,
                                        SELECTABLE_SIZES_CLASSNAMES[size],
                                    )}
                                >
                                    {(state.valid === false || defaultedProps.startAdornment) && (
                                        <div className="flex shrink-0 items-center">
                                            {state.valid === false ? (
                                                <Error fontSize="inherit" className="fill-text-danger-subtle!" />
                                            ) : (
                                                defaultedProps.startAdornment
                                            )}
                                        </div>
                                    )}
                                    {children}
                                </div>
                            )}
                        </ComboboxBase.Value>
                    );
                }}
            >
                {/* --- Input variants --- */}
                {defaultedProps.multiple && defaultedProps.selectionMode === "chips" && (
                    <ComboboxValueChipsInput
                        ref={ref}
                        hasOnlyUnavailableValues={hasOnlyUnavailableValues}
                        getLabelForValue={getLabelForValue}
                        isValueAvailable={isValueAvailable}
                        unavailableValueText={defaultedProps.unavailableValueText}
                        renderItemAdornment={defaultedProps.renderItemAdornment}
                        placeholder={defaultedProps.placeholder}
                    />
                )}
                {defaultedProps.multiple && defaultedProps.selectionMode === "count" && (
                    <ComboboxValueCountInput
                        ref={ref}
                        hasOnlyUnavailableValues={hasOnlyUnavailableValues}
                        flatItems={flatItems}
                        getLabelForValue={getLabelForValue}
                        isValueAvailable={isValueAvailable}
                        unavailableValueText={defaultedProps.unavailableValueText}
                    />
                )}
                {!defaultedProps.multiple && (
                    <ComboboxSingleValueInput
                        ref={ref}
                        hasOnlyUnavailableValues={hasOnlyUnavailableValues}
                        isValueAvailable={isValueAvailable}
                        unavailableValueText={defaultedProps.unavailableValueText}
                        renderItemAdornment={defaultedProps.renderItemAdornment}
                        placeholder={defaultedProps.placeholder}
                    />
                )}

                {/* --- Controls --- */}
                <div className="gap-selectable -mr-3xs box-border flex h-full shrink-0 items-center justify-center empty:hidden">
                    <ComboboxBase.Trigger
                        className="box-border flex items-center justify-center"
                        aria-label="Open options"
                    >
                        <ExpandMore />
                    </ComboboxBase.Trigger>
                    {defaultedProps.showClearAllButton && (
                        <ComboboxBase.Clear
                            aria-label="Clear selection"
                            render={<Button tone="neutral" iconOnly variant="ghost" size="small" />}
                        >
                            <Clear />
                        </ComboboxBase.Clear>
                    )}
                    {defaultedProps.endAdornment && (
                        <div className="flex items-center">{defaultedProps.endAdornment}</div>
                    )}
                </div>
            </ComboboxBase.InputGroup>

            <ComboBoxPopup itemSize={size}>
                <ComboboxBase.Status className="sr-only">
                    {defaultedProps.loading ? defaultedProps.loadingText : defaultedProps.errorText}
                </ComboboxBase.Status>

                {defaultedProps.errorText ? (
                    <div className="p-selectable italic">{defaultedProps.errorText}</div>
                ) : (
                    <React.Fragment>
                        <ComboboxBase.Empty>
                            <div className="p-selectable italic">
                                {defaultedProps.loading ? defaultedProps.loadingText : defaultedProps.noMatchesText}
                            </div>
                        </ComboboxBase.Empty>

                        <ComboboxBase.List>
                            {hasGroups
                                ? (group) => (
                                      <React.Fragment key={group.value}>
                                          <ComboboxBase.Separator className="menu__separator" />
                                          <ComboboxListGroup
                                              group={group}
                                              label={
                                                  group.value === UNAVAILABLE_GROUP_KEY
                                                      ? defaultedProps.unavailableValueText
                                                      : undefined
                                              }
                                          >
                                              {renderValueItem}
                                          </ComboboxListGroup>
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
