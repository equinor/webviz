import { DeltaSurface } from "../implementations/DeltaSurface";
import { OperationGroupType } from "../operationGroupTypes";

import { OperationGroupRegistry } from "./_OperationGroupRegistry";

OperationGroupRegistry.registerGroup(OperationGroupType.DELTA_SURFACE, DeltaSurface);
