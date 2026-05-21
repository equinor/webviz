import { ArrowDownward, Circle, Square, Star } from "@mui/icons-material";
import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";

import { Menu } from ".";

const meta: Meta<typeof Menu.Root> = {
    title: "Components/Menu",
    component: Menu.Root,
    tags: ["autodocs"],
    parameters: {
        layout: "centered",
    },
};

export default meta;
type Story = StoryObj<typeof Menu.Root>;

export const Default: Story = {
    render: () => (
        <Menu.Root>
            <Menu.Trigger>
                <Button>
                    Open menu <ArrowDownward fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup>
                <Menu.Item>Option 1</Menu.Item>
                <Menu.Item>Option 2</Menu.Item>
                <Menu.Item>Option 3</Menu.Item>
            </Menu.Popup>
        </Menu.Root>
    ),
};

export const ComplexItems: Story = {
    render: () => (
        <Menu.Root>
            <Menu.Trigger>
                <Button>
                    Open menu <ArrowDownward fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup>
                <Menu.Item
                    icon={<Star fontSize="inherit" />}
                    description="Option 1 is a thing indeed, and it's using the built in icon and description props"
                >
                    Option 1
                </Menu.Item>
                <Menu.Item icon={<Circle fontSize="inherit" />} description="Option 1 is a thing indeed">
                    Option 2
                </Menu.Item>
                <Menu.Item
                    icon={<Square fontSize="inherit" />}
                    description="Option 1 is a thing indeed. Commodo adipisicing ad magna aliqua. Minim aliqua id est amet mollit. Excepteur occaecat elit id magna consectetur aliquip culpa laborum enim adipisicing ex deserunt. Reprehenderit reprehenderit voluptate sunt labore commodo esse eu enim cillum enim enim consectetur amet. Eu aliqua laboris elit do voluptate elit. Id ipsum non et irure. Eu aliqua id proident nostrud aute eu amet."
                >
                    Option 3
                </Menu.Item>
            </Menu.Popup>
        </Menu.Root>
    ),
};

export const SubMenu: Story = {
    render: () => (
        <Menu.Root>
            <Menu.Trigger>
                <Button>
                    Open menu <ArrowDownward fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup>
                <Menu.Item>Option 1</Menu.Item>
                <Menu.Item>Option 2</Menu.Item>
                <Menu.Separator />
                <Menu.SubmenuItem triggerContent={"Sub menu"}>
                    <Menu.Item>Option 3</Menu.Item>
                    <Menu.Item>Option 4</Menu.Item>
                    <Menu.Item>Option 5</Menu.Item>
                </Menu.SubmenuItem>
            </Menu.Popup>
        </Menu.Root>
    ),
};

export const WithCheckboxItems: Story = {
    render: () => (
        <Menu.Root>
            <Menu.Trigger>
                <Button>
                    Open menu <ArrowDownward fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup>
                <Menu.Item>Option 1</Menu.Item>
                <Menu.Item>Option 2</Menu.Item>

                <Menu.Separator />

                <Menu.Group>
                    <Menu.GroupLabel>Checkbox items</Menu.GroupLabel>

                    <Menu.CheckboxItem>Option 3</Menu.CheckboxItem>
                    <Menu.CheckboxItem>Option 4</Menu.CheckboxItem>
                    <Menu.CheckboxItem>Option 5</Menu.CheckboxItem>
                </Menu.Group>
                <Menu.Separator />
                <Menu.RadioGroup>
                    <Menu.GroupLabel>Radio items</Menu.GroupLabel>

                    <Menu.RadioItem value={1}>Option 6</Menu.RadioItem>
                    <Menu.RadioItem value={2}>Option 7</Menu.RadioItem>
                    <Menu.RadioItem value={3}>Option 8</Menu.RadioItem>
                </Menu.RadioGroup>
            </Menu.Popup>
        </Menu.Root>
    ),
};
