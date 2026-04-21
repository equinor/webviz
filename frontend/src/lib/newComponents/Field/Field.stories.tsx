import React from "react";

import type { FieldRootActions } from "@base-ui/react";
import type { Meta, StoryObj } from "@storybook/react";

import { Combobox } from "@lib/newComponents/Combobox";
import { TextInput } from "@lib/newComponents/TextInput";

import { Field } from "./index";

const meta: Meta<typeof Field.Root> = {
    title: "Components/Field",
    component: Field.Root,
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
            validate={(v) => {
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
            <Field.Details>Must be at least 8 characters.</Field.Details>
            <TextInput placeholder="••••••••" />
        </Field.Root>
    ),
};

export const WithDescription: Story = {
    render: () => (
        <Field.Root>
            <Field.Label>Email</Field.Label>
            <TextInput placeholder="you@example.com" />
            <Field.Description>We will never share your email with anyone.</Field.Description>
        </Field.Root>
    ),
};

export const WithInfo: Story = {
    render: () => (
        <Field.Root>
            <div className="gap-horizontal-xs flex w-full justify-between">
                <Field.Label>API Key</Field.Label>
                <Field.Info>Your secret API key. Keep this safe and never share it.</Field.Info>
            </div>

            <Field.Details>Found in your account settings.</Field.Details>
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
                <Field.Label required>Username</Field.Label>
                <Field.Details>Maximum 10 characters.</Field.Details>
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
            <Field.Details>Select your country of residence.</Field.Details>
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
            <Field.Details>This field cannot be edited.</Field.Details>
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
        <div className="gap-x-horizontal-sm gap-y-vertical-xs grid w-sm grid-cols-2 items-center">
            <Field.Root inline validationMode="onChange">
                <Field.Label required>Password</Field.Label>
                <div className="gap-horizontal-2xs flex items-center">
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
                    <Field.Label>Team</Field.Label>
                    <Field.Details>You can change this later.</Field.Details>
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

export const FullForm: Story = {
    render: () => (
        <div className="gap-vertical-lg flex flex-col">
            <Field.Root>
                <Field.Label required>Full name</Field.Label>
                <TextInput required placeholder="Jane Doe" />
            </Field.Root>
            <Field.Root>
                <Field.Label>Email</Field.Label>
                <Field.Details>Used for login and notifications.</Field.Details>
                <TextInput placeholder="jane@example.com" />
                <Field.Description>We will never share your email.</Field.Description>
            </Field.Root>

            <div className="gap-x-horizontal-sm gap-y-vertical-xs grid w-sm grid-cols-2 items-center">
                <Field.Root inline validationMode="onChange">
                    <Field.Label required>Password</Field.Label>
                    <div className="gap-horizontal-2xs flex items-center">
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
                        <Field.Label>Team</Field.Label>
                        <Field.Details>You can change this later.</Field.Details>
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
