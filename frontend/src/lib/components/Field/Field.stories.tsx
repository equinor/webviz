import React from "react";

import type { FieldRootActions } from "@base-ui/react";
import type { Meta, StoryObj } from "@storybook/react";

import { Combobox } from "@lib/components/Combobox";
import { TextInput } from "@lib/components/TextInput";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { FieldCompositionsDefaultProps } from "./compositions";
import { FieldCompositions } from "./compositions";

import { Field } from "./index";

const meta: Meta<typeof Field.Root> = {
    title: "Components/Field",
    component: Field.Root,
    argTypes: {
        inline: {
            control: "boolean",
        },
    },
    parameters: {
        layout: "centered",
    },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Field.Root>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Errors can either be controlled by an external state and `Root["invalid"]` and `Error["match"]=true`. Alternatively, you can use `Root["invalid"]` and return a custom error message. This message can then be show by `Error["match"]="customError" />`. Further customization can be done with the `Validity` component',
            },
        },
    },
    render: () => (
        <Field.Root
            validationMode="onChange"
            validate={(v: any) => {
                if (typeof v === "string" && v.includes(" ")) return "Name cannot include space";
                return null;
            }}
        >
            <Field.Label>New Username</Field.Label>
            <Field.Description>Name cannot contain spaces </Field.Description>
            <TextInput placeholder="Enter username..." minLength={4} maxLength={10} />
            <Field.Error match="tooShort" />
            <Field.Error match="tooLong" />
            {/* "customError" will return whatever gets returned from validate */}
            <Field.Error match="customError" />
        </Field.Root>
    ),
};

export const WithDetails: Story = {
    render: () => (
        <Field.Root>
            <Field.Label>Password</Field.Label>
            <Field.Description>Must be at least 8 characters.</Field.Description>
            <TextInput placeholder="••••••••" />
        </Field.Root>
    ),
};

export const WithDescription: Story = {
    render: () => (
        <Field.Root>
            <Field.Label>Email</Field.Label>
            <Field.Description>We will never share your email with anyone.</Field.Description>
            <TextInput placeholder="you@example.com" />
        </Field.Root>
    ),
};

export const WithInfo: Story = {
    render: () => (
        <Field.Root>
            <div className="gap-x-xs flex w-full justify-between">
                <Field.Label>API Key</Field.Label>
                <Field.Info>Your secret API key. Keep this safe and never share it.</Field.Info>
            </div>

            <Field.Description>Found in your account settings.</Field.Description>
            <TextInput placeholder="sk-..." />
        </Field.Root>
    ),
};

export const WithError: Story = {
    render: function WithErrorComp() {
        const actionRef = React.useRef<FieldRootActions | null>(null);

        React.useEffect(() => {
            actionRef.current?.validate?.();
        }, []);

        return (
            <Field.Root actionsRef={actionRef} validationMode="onChange" dirty touched>
                <Field.Label indicator="(Required)">Username</Field.Label>
                <Field.Description>Maximum 10 characters.</Field.Description>
                <TextInput required maxLength={10} />
                <Field.Error match="valueMissing">Value is required.</Field.Error>
                <Field.Error match="tooLong">Must be 10 characters or fewer.</Field.Error>
            </Field.Root>
        );
    },
};

export const WithCombobox: Story = {
    render: () => (
        <Field.Root>
            <Field.Label>Country</Field.Label>
            <Field.Description>Select your country of residence.</Field.Description>
            <Combobox
                items={[
                    { value: "no", label: "Norway" },
                    { value: "us", label: "United States" },
                    { value: "gb", label: "United Kingdom" },
                    { value: "de", label: "Germany" },
                ]}
            />
        </Field.Root>
    ),
};

export const Disabled: Story = {
    render: () => (
        <Field.Root>
            <Field.Label>Read-only field</Field.Label>
            <Field.Description>This field cannot be edited.</Field.Description>
            <TextInput defaultValue="Locked value" disabled />
        </Field.Root>
    ),
};

export const Inline: Story = {
    parameters: {
        docs: {
            description: {
                story: "For labels and controllers that should connect without a wrapping div, use the `inline` prop. The story shows the correct setup for a grid layout",
            },
        },
    },
    render: () => (
        <div className="gap-x-sm gap-y-xs grid w-sm grid-cols-2 items-center">
            <Field.Root inline validationMode="onChange">
                <Field.Label indicator="(Required)">Password</Field.Label>
                <div className="gap-x-2xs flex items-center">
                    <TextInput
                        minLength={8}
                        required
                        type="password"
                        placeholder="••••••••"
                        pattern="^(?=.*[a-zA-Z])(?=.*\d).+$"
                    />
                    <Field.Info>
                        The password should:
                        <ul className="list-inside list-disc">
                            <li>Be at least 8 characters long</li>
                            <li>Contain both letters and numbers</li>
                        </ul>
                    </Field.Info>
                </div>
                <div className="col-span-2 flex">
                    <Field.Error />
                </div>
            </Field.Root>

            <Field.Root inline>
                <div>
                    <Field.Label indicator="(Optional)">Team</Field.Label>
                    <Field.Description>You can change this later.</Field.Description>
                </div>
                <Combobox
                    items={[
                        { value: "eng", label: "Engineering" },
                        { value: "design", label: "Design" },
                        { value: "product", label: "Product" },
                    ]}
                />
            </Field.Root>
        </div>
    ),
};

export const DefaultComposition: StoryObj<FieldCompositionsDefaultProps> = {
    args: {
        gridLayout: false,
        singleError: true,
    },
    render: (args) => (
        <div
            className={resolveClassNames("gap-x-md gap-y-sm w-sm", {
                "**:[.--errorWrapper]:-mt-xs grid grid-cols-2 items-center": args.gridLayout,
                "flex flex-col": !args.gridLayout,
            })}
        >
            <FieldCompositions.Default {...args} indicator="(Required)" label="Full name">
                <TextInput required placeholder="Jane Doe" />
            </FieldCompositions.Default>

            <FieldCompositions.Default
                {...args}
                indicator="(Required)"
                label="Password"
                validationMode="onChange"
                info={
                    <>
                        The password should:
                        <ul className="list-inside list-disc">
                            <li>Be at least 8 characters long</li>
                            <li>Contain both letters and numbers</li>
                        </ul>
                    </>
                }
            >
                <TextInput
                    defaultValue={"a"}
                    minLength={8}
                    required
                    type="password"
                    placeholder="••••••••"
                    pattern="^(?=.*[a-zA-Z])(?=.*\d).+$"
                />
            </FieldCompositions.Default>

            <FieldCompositions.Default
                {...args}
                label="Email"
                description="Used for login and notifications. We will never share your email."
            >
                <TextInput placeholder="jane@example.com" />
            </FieldCompositions.Default>
        </div>
    ),
};

export const FullForm: Story = {
    render: () => (
        <div className="gap-y-lg flex flex-col">
            <Field.Root>
                <Field.Label indicator="(Required)">Full name</Field.Label>
                <TextInput required placeholder="Jane Doe" />
            </Field.Root>
            <Field.Root>
                <Field.Label>Email</Field.Label>
                <Field.Description>Used for login and notifications. We will never share your email.</Field.Description>
                <TextInput placeholder="jane@example.com" />
            </Field.Root>

            <div className="gap-x-sm gap-y-xs grid w-sm grid-cols-2 items-center">
                <Field.Root
                    inline
                    validationMode="onChange"
                    validate={(v) => {
                        if (typeof v !== "string") return null;

                        if (v.toLowerCase().match(/password|pass\d+|12345|qwerty|admin/)) {
                            return "Password is too common or weak";
                        }

                        return null;
                    }}
                >
                    <Field.Label indicator="(Required)">Password</Field.Label>
                    <div className="gap-x-2xs flex items-center">
                        <TextInput
                            minLength={8}
                            required
                            type="password"
                            placeholder="••••••••"
                            pattern="^(?=.*[a-zA-Z])(?=.*\d).+$"
                        />
                        <Field.Info>
                            The password should:
                            <ul className="list-inside list-disc">
                                <li>Be at least 8 characters long</li>
                                <li>Contain both letters and numbers</li>
                            </ul>
                        </Field.Info>
                    </div>
                    <FieldCompositions.GenericErrors layoutClassName="col-span-2" single />
                </Field.Root>

                <Field.Root inline>
                    <div>
                        <Field.Label indicator="(Optional)">Team</Field.Label>
                        <Field.Description>You can change this later.</Field.Description>
                    </div>
                    <Combobox
                        items={[
                            { value: "eng", label: "Engineering" },
                            { value: "design", label: "Design" },
                            { value: "product", label: "Product" },
                        ]}
                    />
                </Field.Root>
            </div>
        </div>
    ),
};
