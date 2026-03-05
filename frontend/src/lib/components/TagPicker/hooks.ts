import React from "react";

export function useOnScreenChangeHandler(ref: React.RefObject<HTMLElement>, callback: (isOnScreen: boolean) => void) {
    React.useEffect(
        function setupObserverEffect() {
            const observer = new IntersectionObserver(([entry]) => {
                callback(entry.isIntersecting);
            });

            if (ref.current) observer.observe(ref.current);
            return () => observer.disconnect();
        },
        [callback, ref],
    );
}
