import type { Meta, StoryObj } from "@storybook/react";

import { MarkdownWrapper } from "./MarkdownWrapper";

const meta: Meta<typeof MarkdownWrapper> = {
    title: "Framework - Internal/MarkdownWrapper",
    component: MarkdownWrapper,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
};

export default meta;
type Story = StoryObj<typeof MarkdownWrapper>;

const sampleMarkdown = `
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

This is a paragraph with **bold text**, *italic text*, and \`inline code\`.

![Sample Image](https://picsum.photos/400/200)

---

## Lists

### Unordered List
- Item 1
- Item 2
  - Nested item 1
  - Nested item 2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item

## Code Block

\`\`\`typescript
function example() {
    console.log("Hello, World!");
}
\`\`\`

## Links and Images

[Link to example](https://example.com)

## Blockquote

> This is a blockquote.
> It can span multiple lines.
`;

// We dont care about tables, I think
/*
## Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
*/

export const Default: Story = {
    args: {
        children: sampleMarkdown,
    },
};

export const SimpleText: Story = {
    args: {
        children: "This is a simple paragraph with **bold** and *italic* text.",
    },
};

export const CodeOnly: Story = {
    args: {
        children: `
\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`
`,
    },
};

export const EmptyContent: Story = {
    args: {
        children: "",
    },
};
