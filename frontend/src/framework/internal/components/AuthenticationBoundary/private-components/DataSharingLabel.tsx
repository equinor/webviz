export function DataSharingLabel() {
    return (
        <div className="border-2 border-orange-600 px-3 py-2 rounded-sm max-w-[600px] text-justify mt-4 z-50 shadow-sm">
            <p>
                <strong>Disclaimer:</strong> Webviz is a service provided by Equinor and is not a way of sharing
                official data. Data should continue to be shared through L2S, FTP and/or Dasha.
            </p>
            <p className="mt-3">
                References to e.g. earlier models, model results and data should still be done through the mentioned
                tools, and not Webviz. Since Webviz is currently under heavy development and not production ready, there
                is no guarantee given as of now that calculations are error-free.
            </p>
        </div>
    );
}
