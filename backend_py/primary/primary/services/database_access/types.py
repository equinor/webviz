from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ModuleState(BaseModel):
    module_name: str = Field(..., alias="moduleName")  # e.g., "viewer", "plot"
    module_instance_id: str = Field(..., alias="moduleInstanceId")
    state: Dict[str, Any]

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class DashboardContent(BaseModel):
    layout: List[Dict[str, Any]]  # use Dict for layout, frontend-defined
    module_states: List[ModuleState] = Field(..., alias="moduleStates")
    cross_module_state: Dict[str, Any] = Field(..., alias="crossModuleState")

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class DashboardMetadata(BaseModel):
    dashboard_id: str = Field(..., alias="dashboardId")
    title: str
    description: Optional[str] = None
    created_by: str = Field(..., alias="createdBy")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: Optional[datetime] = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class SharedDashboard(BaseModel):
    id: str
    owner_id: str = Field(..., alias="ownerId")
    frozen_at: datetime = Field(..., alias="frozenAt")
    content: DashboardContent

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True


class PrivateDashboard(BaseModel):
    id: str
    user_id: str = Field(..., alias="userId")
    metadata: DashboardMetadata
    content: DashboardContent
    version: int

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
