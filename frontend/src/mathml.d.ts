import type React from "react";

// @types/react does not include MathML elements, which all modern browsers render natively
type MathMLProps = React.HTMLAttributes<HTMLElement> & {
    display?: "block" | "inline";
    mathvariant?: string;
    stretchy?: "true" | "false";
};

declare module "react" {
    namespace JSX {
        interface IntrinsicElements {
            math: MathMLProps;
            mfrac: MathMLProps;
            mi: MathMLProps;
            mn: MathMLProps;
            mo: MathMLProps;
            mrow: MathMLProps;
            msub: MathMLProps;
            munder: MathMLProps;
        }
    }
}
