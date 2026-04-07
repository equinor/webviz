import { Combobox as ComboboxBase } from "@base-ui/react";
import type { ComboboxRootProps } from "@base-ui/react";
import { Check, Clear, UnfoldMore } from "@mui/icons-material";

export type ComboboxProps<TValue, TMultiple extends boolean | undefined = false> = ComboboxRootProps<
    TValue,
    TMultiple
> & {
    placeholder?: string;
};

const DEFAULT_PROPS = {
    placeholder: "Select an option",
} satisfies Partial<ComboboxProps<any>>;

export function Combobox<TValue, TMultiple extends boolean | undefined = false>(
    props: ComboboxProps<TValue, TMultiple>,
) {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const { placeholder, ...restRootProps } = defaultedProps;

    return (
        <ComboboxBase.Root {...restRootProps}>
            <ComboboxBase.InputGroup className="form-element border-stroke-neutral-strong bg-fill-canvas text-body-sm relative flex items-center rounded border [&:has(.Clear)_input]:pr-[calc(2*(var(--text-body-sm)+var(--spacing-selectable-x)))]">
                <ComboboxBase.Input
                    placeholder={placeholder}
                    className="pl-selectable-x py-selectable-y box-border w-full grow border-0 bg-transparent pr-[calc(var(--text-body-sm)+var(--spacing-selectable-x))] focus:outline-0"
                />
                <div className="right-selectable-x gap-selectable-x absolute bottom-0 box-border flex h-full items-center justify-center">
                    <ComboboxBase.Clear className="Clear box-border flex items-center justify-center">
                        <Clear fontSize="inherit" />
                    </ComboboxBase.Clear>
                    <ComboboxBase.Trigger className="box-border flex items-center justify-center">
                        <UnfoldMore fontSize="inherit" />
                    </ComboboxBase.Trigger>
                </div>
            </ComboboxBase.InputGroup>
            <ComboboxBase.Portal>
                <ComboboxBase.Positioner className="outline-0" sideOffset={4}>
                    <ComboboxBase.Popup className="bg-fill-floating shadow-elevation-overlay box-border max-w-(--available-width) min-w-(--anchor-width) origin-(--transform-origin) rounded transition-transform data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
                        <ComboboxBase.Empty className="">{defaultedProps.placeholder}</ComboboxBase.Empty>
                        <ComboboxBase.List className="">
                            {(item) => (
                                <ComboboxBase.Item
                                    key={props.itemToStringValue?.(item) ?? item.value}
                                    value={item}
                                    className="user-select-none py-selectable-y px-selectable-x gap-space-xs data-highlighted:text-text-accent-strong data-highlighted:bg-fill-accent-hover box-border grid grid-cols-[0.75rem_1fr] items-center outline-0 data-highlighted:relative data-highlighted:z-0 data-highlighted:before:absolute data-highlighted:before:-z-1 data-highlighted:before:content-['']"
                                >
                                    <ComboboxBase.ItemIndicator className="text-text-accent-subtle col-start-1">
                                        <Check fontSize="inherit" />
                                    </ComboboxBase.ItemIndicator>
                                    <div className="col-start-2">{props.itemToStringLabel?.(item) ?? item.label}</div>
                                </ComboboxBase.Item>
                            )}
                        </ComboboxBase.List>
                    </ComboboxBase.Popup>
                </ComboboxBase.Positioner>
            </ComboboxBase.Portal>
        </ComboboxBase.Root>
    );
}
