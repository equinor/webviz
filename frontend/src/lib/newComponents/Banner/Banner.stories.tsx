import type { Meta, StoryObj } from "@storybook/react";

import { Banner } from "./banner";

const meta: Meta<typeof Banner> = {
    title: "Components/Banner",
    component: Banner,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A contextual inline message used to communicate status or feedback to the user.

## When to use

- Inform the user of a system state (info, success, warning, or error)
- Provide persistent feedback that relates to a specific section of the page
                `.trim(),
            },
        },
    },
    tags: ["autodocs"],
    argTypes: {
        tone: {
            control: "select",
            options: ["warning", "danger", "success", "info"],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Info: Story = {
    parameters: {
        docs: {
            description: {
                story: "Default tone for general informational messages.",
            },
        },
    },
    args: {
        children: "Your session will expire in 10 minutes.",
        tone: "info",
    },
};

export const Success: Story = {
    parameters: {
        docs: {
            description: {
                story: "Confirms a completed action or positive outcome.",
            },
        },
    },
    args: {
        children: "Changes saved successfully.",
        tone: "success",
    },
};

export const Warning: Story = {
    parameters: {
        docs: {
            description: {
                story: "Alerts the user to a condition that may need attention.",
            },
        },
    },
    args: {
        children: "Storage is almost full. Free up space to continue.",
        tone: "warning",
    },
};

export const Danger: Story = {
    parameters: {
        docs: {
            description: {
                story: "Communicates an error or destructive condition.",
            },
        },
    },
    args: {
        children: "Failed to save. Please try again.",
        tone: "danger",
    },
};
