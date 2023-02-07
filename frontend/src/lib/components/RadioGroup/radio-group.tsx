import React from "react";

import { RadioGroup as RadioGroupComponent } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/20/solid'
export type RadioItem = {
    value: string | number;
    label: string;
    disabled?: boolean;
};

type RadioGroupProps = {

    items: RadioItem[];
    selectedItem: string | number;
    onSelect: (item: string) => void;
};

export const RadioGroup: React.FC<RadioGroupProps> = (props) => {
    return (
        <RadioGroupComponent value={props.selectedItem} onChange={props.onSelect}>

            <div className="rounded-md bg-white">
                {props.items.map((item) => (
                    <RadioGroupComponent.Option
                        key={item.value}
                        value={item.value}
                        className={({ active, checked }) =>
                            `${active
                                ? 'ring-2 ring-white ring-opacity-60 ring-offset-2 ring-offset-sky-300'
                                : ''
                            }
                        ${checked ? 'bg-sky-900 bg-opacity-75 text-white' : 'bg-gray-200'
                            }
                          relative flex cursor-pointer rounded-lg px-5 py-1 shadow-md focus:outline-none`
                        }
                    >
                        {({ checked }) => (
                            <div className="flex w-full items-center justify-between">
                                <div className="flex items-center">
                                    <div className="text-sm">
                                        {/* This label is for the `RadioGroupComponent.Option`.  */}
                                        <RadioGroupComponent.Label
                                            as="p"
                                            className={`font-medium  ${checked ? 'text-white' : 'text-gray-900'
                                                }`}
                                        >
                                            {item.value}
                                        </RadioGroupComponent.Label>
                                        {/* This description is for the `RadioGroupComponent.Option`.  */}
                                        <RadioGroupComponent.Description
                                            as="span"
                                            className={`inline ${checked ? 'text-sky-100' : 'text-gray-500'
                                                }`}
                                        >
                                            {item.label}

                                        </RadioGroupComponent.Description>
                                    </div>
                                </div>
                                {checked && (
                                    <div className="shrink-0 text-white">
                                        <CheckIcon className="h-6 w-6" />
                                    </div>
                                )}
                            </div>

                        )}
                    </RadioGroupComponent.Option>))}
            </div>
        </RadioGroupComponent>
    )
}