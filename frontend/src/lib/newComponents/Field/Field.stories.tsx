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
    render: () => (
        <Field.Root>
            <Field.Label>Username</Field.Label>
            <TextInput placeholder="Enter username..." />
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
            <Field.Label info="Your secret API key. Keep this safe and never share it.">API Key</Field.Label>
            <Field.Details>Found in your account settings.</Field.Details>
            <TextInput placeholder="sk-..." />
        </Field.Root>
    ),
};

export const WithError: Story = {
    render: () => (
        <Field.Root>
            <Field.Label>Username</Field.Label>
            <Field.Details>Maximum 10 characters.</Field.Details>
            <TextInput defaultValue="this-is-too-long" maxLength={10} />
            <Field.Error match="tooLong">Must be 10 characters or fewer.</Field.Error>
        </Field.Root>
    ),
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

export const FullForm: Story = {
    render: () => (
        <div className="flex w-80 flex-col gap-4">
            <Field.Root>
                <Field.Label>Full name</Field.Label>
                <TextInput placeholder="Jane Doe" />
            </Field.Root>
            <Field.Root>
                <Field.Label>Email</Field.Label>
                <Field.Details>Used for login and notifications.</Field.Details>
                <TextInput placeholder="jane@example.com" />
                <Field.Description>We will never share your email.</Field.Description>
            </Field.Root>
            <Field.Root>
                <Field.Label info="Select the team this user belongs to.">Team</Field.Label>
                <Field.Details>You can change this later.</Field.Details>
                <Combobox
                    items={[
                        { value: "eng", label: "Engineering" },
                        { value: "design", label: "Design" },
                        { value: "product", label: "Product" },
                    ]}
                />
            </Field.Root>
            <Field.Root>
                <Field.Label>Password</Field.Label>
                <Field.Details>Minimum 8 characters.</Field.Details>
                <TextInput placeholder="••••••••" maxLength={7} />
                <Field.Error match="tooLong">Password must be at least 8 characters.</Field.Error>
            </Field.Root>
        </div>
    ),
};
