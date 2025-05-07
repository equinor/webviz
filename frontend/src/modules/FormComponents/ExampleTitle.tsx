import type React from "react";

export type ExampleTitleProps = {
    children: React.ReactNode;
};

export function ExampleTitle(props: ExampleTitleProps): React.ReactNode {
    return (
        <div className="col-span-2 text-sm italic text-gray-700 flex items-center">
            <hr className="h-px w-4 bg-gray-900 mr-3" />
            <span>{props.children}</span>
            <hr className="h-px grow bg-gray-900 ml-3" />
        </div>
    );
}
