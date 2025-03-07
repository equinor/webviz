import React from "react";

import { Listbox, Transition } from "@headlessui/react";
import { Check, UnfoldMore } from "@mui/icons-material";

export type ListBoxItem = {
    value: string | number;
    label: string;
    disabled?: boolean;
};

type ListBoxProps = {
    items: ListBoxItem[];
    selectedItem: string | number;
    onSelect: (item: string) => void;
};
export const ListBoxDeprecated: React.FC<ListBoxProps> = (props) => {
    const selectedItemLabel =
        props.items.find((item) => item.value === props.selectedItem)?.label || "Please select...";
    return (
        <div className="w-72">
            <Listbox value={props.selectedItem} onChange={props.onSelect}>
                <div className="relative mt-1">
                    <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                        <span className="block truncate">{selectedItemLabel}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <UnfoldMore fontSize="small" className="text-gray-400" aria-hidden="true" />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={React.Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="z-10 absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-hidden sm:text-sm left-0 top-0">
                            {props.items.map((item) => (
                                <Listbox.Option
                                    key={item.value}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                            active ? "bg-amber-100 text-amber-900" : "text-gray-900"
                                        }`
                                    }
                                    value={item.value}
                                    disabled={item.disabled}
                                >
                                    {({ selected }) => (
                                        <>
                                            <span
                                                className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                                            >
                                                {item.label}
                                            </span>
                                            {selected ? (
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                                    <Check fontSize="small" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Listbox.Option>
                            ))}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
        </div>
    );
};
