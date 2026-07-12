from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str
    role: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        orm_mode = True
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str


# Asset History Schema
class AssetHistoryBase(BaseModel):
    actor: str
    action: str
    details: str

class AssetHistory(AssetHistoryBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True
        from_attributes = True


# Maintenance Record Schemas
class MaintenanceRecordBase(BaseModel):
    notes: str
    parts_used: Optional[str] = None
    cost: float = 0.0
    start_date: str
    end_date: str
    technician_name: str
    status: str = "Completed"

class MaintenanceRecordCreate(MaintenanceRecordBase):
    issue_id: Optional[int] = None

class MaintenanceRecord(MaintenanceRecordBase):
    id: int
    asset_id: int
    issue_id: Optional[int] = None

    class Config:
        orm_mode = True
        from_attributes = True


# Issue Schemas
class IssueBase(BaseModel):
    title: str
    description: str
    priority: str
    category: str
    reporter_name: str
    reporter_contact: Optional[str] = None
    status: str = "Reported"
    evidence_url: Optional[str] = None

class IssueCreate(IssueBase):
    # For AI triage
    ai_suggested_title: Optional[str] = None
    ai_suggested_category: Optional[str] = None
    ai_suggested_priority: Optional[str] = None
    ai_possible_causes: Optional[str] = None
    ai_diagnostic_checks: Optional[str] = None
    ai_pattern_warning: Optional[str] = None
    ai_used: Optional[int] = 0

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    technician_id: Optional[int] = None
    evidence_url: Optional[str] = None

class Issue(IssueBase):
    id: int
    issue_number: str
    asset_id: int
    technician_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    
    # AI Triage Caches
    ai_suggested_title: Optional[str] = None
    ai_suggested_category: Optional[str] = None
    ai_suggested_priority: Optional[str] = None
    ai_possible_causes: Optional[str] = None
    ai_diagnostic_checks: Optional[str] = None
    ai_pattern_warning: Optional[str] = None
    ai_used: Optional[int] = 0
    
    technician: Optional[User] = None

    class Config:
        orm_mode = True
        from_attributes = True


# Asset Schemas
class AssetBase(BaseModel):
    name: str
    category: str
    location: str
    status: str = "Operational"
    condition: str = "Excellent"
    serial: Optional[str] = None
    value: float = 0.0
    purchase_date: Optional[str] = None
    last_service_date: Optional[str] = None
    next_service_date: Optional[str] = None
    description: Optional[str] = None

class AssetCreate(AssetBase):
    asset_code: Optional[str] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    serial: Optional[str] = None
    value: Optional[float] = None
    purchase_date: Optional[str] = None
    last_service_date: Optional[str] = None
    next_service_date: Optional[str] = None
    description: Optional[str] = None

class Asset(AssetBase):
    id: int
    asset_code: str
    qr_code_url: Optional[str] = None
    issues: List[Issue] = []
    maintenance_records: List[MaintenanceRecord] = []
    history: List[AssetHistory] = []

    class Config:
        orm_mode = True
        from_attributes = True


# AI Triage Payload & Response
class AITriageRequest(BaseModel):
    user_complaint: str
    asset_id: int

class AITriageResponse(BaseModel):
    title: str
    category: str
    priority: str
    possible_causes: List[str]
    diagnostic_checks: List[str]
    pattern_warning: Optional[str] = None


# Dashboard Statistics Schema
class DashboardStats(BaseModel):
    total_assets: int
    active_issues: int
    pending_maintenance: int
    operational_rate: float
    status_distribution: dict
    priority_distribution: dict
    category_distribution: dict
