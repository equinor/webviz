import { AuthenticationBoundary } from "@framework/internal/components/AuthenticationBoundary";
import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

import { WorkbenchWrapper } from "./framework/internal/components/WorkbenchWrapper/workbenchWrapper";
import { GlobalConfirmationDialog } from "@framework/internal/components/GlobalConfirmationDialog";

function App() {
    return (
        <div className="bg-gray-100">
            <GlobalConfirmationDialog />
            <AuthenticationBoundary>
                <WorkbenchWrapper />
            </AuthenticationBoundary>
        </div>
    );
}

export default App;
