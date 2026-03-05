import type React from "react";

import { MenuExample } from "./libExamples/MenuExample";

export function LibSandbox(): React.ReactNode {
    return (
        <section>
            <h1 className="text-3xl">Library components</h1>

            <h2 className="mt-6 text-xl">Menu</h2>
            <div className="border-l-2 border-gray-300 pl-2">
                <MenuExample />
            </div>
        </section>
    );
}
