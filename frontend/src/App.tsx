import { AuthenticationBoundary } from "@framework/internal/components/AuthenticationBoundary";
import { GlobalConfirmationDialog } from "@framework/internal/components/GlobalConfirmationDialog";
import { WorkbenchWrapper } from "@framework/internal/components/WorkbenchWrapper/workbenchWrapper";

import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

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
