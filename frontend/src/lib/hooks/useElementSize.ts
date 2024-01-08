import React from "react";

import { Size } from "@lib/utils/geometry";

export function useElementSize(ref: React.RefObject<HTMLElement>): Size {
    const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });

    React.useEffect(() => {
        const handleResize = (): void => {
            let newSize: Size = { width: 0, height: 0 };
            if (ref.current) {
                // Element is not visible - do not change size as it might be expensive to render
                if (!(ref.current.offsetWidth || ref.current.offsetHeight || ref.current.getClientRects().length)) {
                    return;
                }
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
}
