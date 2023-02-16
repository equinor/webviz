import React from "react";

import { Size } from "@framework/utils/geometry";

export const useSize = (ref: React.RefObject<HTMLElement>) => {
    const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });

    React.useLayoutEffect(() => {
        const handleResize = (): void => {
            let newSize: Size = { width: 0, height: 0 };
            if (ref.current) {
                newSize = {
                    width: ref.current.offsetWidth,
                    height: ref.current.offsetHeight,
                };
            }
            setSize(newSize);
        };

        const resizeObserver = new ResizeObserver(handleResize);

        if (ref.current) {
            handleResize();
            resizeObserver.observe(ref.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [ref]);

    return size;
};
