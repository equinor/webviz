import type { Preview } from "@storybook/react";

import "@fontsource-variable/inter/wght.css";
import "../src/styles/index.css";

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
};

export default preview;
