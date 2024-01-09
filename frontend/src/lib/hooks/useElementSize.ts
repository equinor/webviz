import React from "react";

import { Size } from "@lib/utils/geometry";

export function useElementSize(ref: React.RefObject<HTMLElement>): Size {
    const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });

    React.useEffect(() => {
        let isHidden = false;
        let currentSize = { width: 0, height: 0 };
        const handleResize = (): void => {
            let newSize: Size = { width: 0, height: 0 };
            if (ref.current) {
                // If element is not visible do not change size as it might be expensive to render
                if (!(ref.current.offsetWidth || ref.current.offsetHeight || ref.current.getClientRects().length)) {
                    isHidden = true;
                    return;
                }

                newSize = {
                    width: ref.current.offsetWidth,
                    height: ref.current.offsetHeight,
                };

                if (isHidden && currentSize.width === newSize.width && currentSize.height === newSize.height) {
                    isHidden = false;
                    return;
                }

                currentSize = newSize;
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
