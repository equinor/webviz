import React from "react";

import { WebvizSpinnerAmsterdam } from "./WebvizSpinner/webvizSpinnerAmsterdam";

export function TempMovedToAmsterdamNotifier(): React.ReactNode {
    const [timeLeft, setTimeLeft] = React.useState(10);

    React.useEffect(() => {
        let internalTimeLeft = 10;
        const interval = setInterval(() => {
            if (internalTimeLeft === 0) {
                window.location.href = "https://webviz.app.c2.radix.equinor.com/";
                return;
            }
            setTimeLeft((prevTimeLeft) => prevTimeLeft - 1);
            internalTimeLeft--;
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center gap-8">
            <WebvizSpinnerAmsterdam size={100} />
            <div className="text-lg font-bold">Webviz moved to Amsterdam</div>
            <div>
                You can now find us at:{" "}
                <a href="https://webviz.app.c2.radix.equinor.com/" className="text-blue-600 underline">
                    https://webviz.app.c2.radix.equinor.com/
                </a>
            </div>
            <div>We are taking you to our new address in {timeLeft}s...</div>
        </div>
    );
}
