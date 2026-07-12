import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)  # Plain text or hash for simplicity
    role = Column(String)  # Admin, Technician, Supervisor

    # Relationships
    assigned_issues = relationship("Issue", back_populates="technician")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String, unique=True, index=True) # Unique generated code (e.g. #AC-8842-X)
    name = Column(String, index=True)
    category = Column(String, index=True)
    location = Column(String)
    status = Column(String, default="Operational") # Operational, Issue Reported, Under Inspection, Under Maintenance, Out of Service, Retired
    condition = Column(String, default="Excellent") # Excellent, Good, Fair, Poor
    serial = Column(String, nullable=True)
    value = Column(Float, default=0.0)
    purchase_date = Column(String, nullable=True)
    last_service_date = Column(String, nullable=True)
    next_service_date = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    qr_code_url = Column(String, nullable=True)

    # Relationships
    issues = relationship("Issue", back_populates="asset", cascade="all, delete-orphan")
    maintenance_records = relationship("MaintenanceRecord", back_populates="asset", cascade="all, delete-orphan")
    history = relationship("AssetHistory", back_populates="asset", cascade="all, delete-orphan")

class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    issue_number = Column(String, unique=True, index=True) # Generated e.g., #REQ-1002
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"))
    title = Column(String)
    description = Column(Text)
    priority = Column(String) # Low, Medium, High, Critical
    category = Column(String)
    reporter_name = Column(String)
    reporter_contact = Column(String, nullable=True)
    status = Column(String, default="Reported") # Reported, Assigned, Inspection Started, Maintenance In Progress, Waiting For Parts, Resolved, Closed, Reopened
    evidence_url = Column(String, nullable=True)
    technician_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # AI Triage Cache
    ai_suggested_title = Column(String, nullable=True)
    ai_suggested_category = Column(String, nullable=True)
    ai_suggested_priority = Column(String, nullable=True)
    ai_possible_causes = Column(Text, nullable=True) # JSON or newline separated
    ai_diagnostic_checks = Column(Text, nullable=True) # JSON or newline separated
    ai_pattern_warning = Column(Text, nullable=True)
    ai_used = Column(Integer, default=0) # 0 = No, 1 = Yes

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    asset = relationship("Asset", back_populates="issues")
    technician = relationship("User", back_populates="assigned_issues")
    maintenance_records = relationship("MaintenanceRecord", back_populates="issue")

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"))
    issue_id = Column(Integer, ForeignKey("issues.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text)
    parts_used = Column(String, nullable=True)
    cost = Column(Float, default=0.0)
    start_date = Column(String)
    end_date = Column(String)
    technician_name = Column(String)
    status = Column(String, default="Completed") # Scheduled, Completed, Cancelled

    # Relationships
    asset = relationship("Asset", back_populates="maintenance_records")
    issue = relationship("Issue", back_populates="maintenance_records")

class AssetHistory(Base):
    __tablename__ = "asset_history"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="CASCADE"))
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    actor = Column(String) # Admin, Technician, Reporter, AI
    action = Column(String) # Registered, Issue Reported, Inspected, Maintenance Logged, Status Changed
    details = Column(Text)

    # Relationships
    asset = relationship("Asset", back_populates="history")
