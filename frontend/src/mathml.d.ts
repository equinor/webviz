import type React from "react";

// @types/react does not include MathML elements, which all modern browsers render natively
type MathMLProps = React.HTMLAttributes<HTMLElement> & {
    mathvariant?: string;
    stretchy?: "true" | "false";
};

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            math: MathMLProps;
            mi: MathMLProps;
            mo: MathMLProps;
            mrow: MathMLProps;
        }
    }
}
