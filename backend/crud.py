import random
from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas
import datetime

# Helper to generate unique asset codes
def generate_asset_code(db: Session, category: str) -> str:
    prefix = "AC"
    if category:
        words = category.split()
        prefix = "".join([w[0].upper() for w in words])[:3]
    
    for _ in range(10):
        num = random.randint(1000, 9999)
        char = chr(random.randint(65, 90))  # A-Z
        candidate = f"#{prefix}-{num}-{char}"
        exists = db.query(models.Asset).filter(models.Asset.asset_code == candidate).first()
        if not exists:
            return candidate
    return f"#AC-{random.randint(10000, 99999)}"

# Helper to generate unique request numbers
def generate_issue_number(db: Session) -> str:
    for _ in range(10):
        num = random.randint(1000, 9999)
        candidate = f"#REQ-{num}"
        exists = db.query(models.Issue).filter(models.Issue.issue_number == candidate).first()
        if not exists:
            return candidate
    return f"#REQ-{random.randint(10000, 99999)}"

# Asset History Logger
def log_asset_event(db: Session, asset_id: int, actor: str, action: str, details: str):
    history_entry = models.AssetHistory(
        asset_id=asset_id,
        actor=actor,
        action=action,
        details=details
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    return history_entry

# User Operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_technicians(db: Session):
    return db.query(models.User).filter(models.User.role == "Technician").all()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(
        username=user.username,
        password_hash=user.password,  # Simple plain text or MD5 hash for simplicity
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Asset Operations
def get_asset(db: Session, asset_id: int):
    return db.query(models.Asset).filter(models.Asset.id == asset_id).first()

def get_asset_by_code(db: Session, asset_code: str):
    return db.query(models.Asset).filter(models.Asset.asset_code == asset_code).first()

def get_assets(db: Session, skip: int = 0, limit: int = 100, category: str = None, status: str = None, q: str = None):
    query = db.query(models.Asset)
    if category and category != "All Categories":
        query = query.filter(models.Asset.category == category)
    if status and status != "All Statuses":
        query = query.filter(models.Asset.status == status)
    if q:
        query = query.filter(
            (models.Asset.name.ilike(f"%{q}%")) |
            (models.Asset.asset_code.ilike(f"%{q}%")) |
            (models.Asset.location.ilike(f"%{q}%"))
        )
    return query.offset(skip).limit(limit).all()

def count_assets(db: Session, category: str = None, status: str = None, q: str = None):
    query = db.query(func.count(models.Asset.id))
    if category and category != "All Categories":
        query = query.filter(models.Asset.category == category)
    if status and status != "All Statuses":
        query = query.filter(models.Asset.status == status)
    if q:
        query = query.filter(
            (models.Asset.name.ilike(f"%{q}%")) |
            (models.Asset.asset_code.ilike(f"%{q}%")) |
            (models.Asset.location.ilike(f"%{q}%"))
        )
    return query.scalar()

def create_asset(db: Session, asset: schemas.AssetCreate, actor: str = "Admin"):
    asset_code_str = asset.asset_code or generate_asset_code(db, asset.category)
    
    # Check if duplicate asset_code
    existing = db.query(models.Asset).filter(models.Asset.asset_code == asset_code_str).first()
    if existing:
        raise ValueError("Duplicate asset code code is rejected.")

    # QR Code URL points to public asset page
    qr_url = f"/public/asset/{asset_code_str}"

    db_asset = models.Asset(
        asset_code=asset_code_str,
        name=asset.name,
        category=asset.category,
        location=asset.location,
        status=asset.status or "Operational",
        condition=asset.condition or "Excellent",
        serial=asset.serial,
        value=asset.value,
        purchase_date=asset.purchase_date or datetime.date.today().strftime("%Y-%m-%d"),
        last_service_date=asset.last_service_date,
        next_service_date=asset.next_service_date,
        description=asset.description,
        qr_code_url=qr_url
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    log_asset_event(
        db, 
        asset_id=db_asset.id, 
        actor=actor, 
        action="Registered", 
        details=f"Asset registered with code {asset_code_str}."
    )
    
    return db_asset

def update_asset(db: Session, db_asset: models.Asset, asset_update: schemas.AssetUpdate, actor: str = "Admin"):
    update_data = asset_update.dict(exclude_unset=True)
    old_status = db_asset.status
    old_cond = db_asset.condition
    
    for key, value in update_data.items():
        setattr(db_asset, key, value)
        
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    # Log details
    changes = []
    if "status" in update_data and update_data["status"] != old_status:
        changes.append(f"Status changed from {old_status} to {db_asset.status}")
    if "condition" in update_data and update_data["condition"] != old_cond:
        changes.append(f"Condition changed from {old_cond} to {db_asset.condition}")
        
    if changes:
        log_asset_event(
            db,
            asset_id=db_asset.id,
            actor=actor,
            action="Status Changed",
            details="; ".join(changes)
        )
    else:
        log_asset_event(
            db,
            asset_id=db_asset.id,
            actor=actor,
            action="Updated",
            details="Asset descriptive metadata updated."
        )
        
    return db_asset

def delete_asset(db: Session, db_asset: models.Asset):
    db.delete(db_asset)
    db.commit()
    return True

# Issue Operations
def get_issue(db: Session, issue_id: int):
    return db.query(models.Issue).filter(models.Issue.id == issue_id).first()

def get_issues(db: Session, asset_id: int = None, status: str = None, technician_id: int = None):
    query = db.query(models.Issue)
    if asset_id:
        query = query.filter(models.Issue.asset_id == asset_id)
    if status:
        query = query.filter(models.Issue.status == status)
    if technician_id:
        query = query.filter(models.Issue.technician_id == technician_id)
    return query.order_by(models.Issue.created_at.desc()).all()

def create_issue(db: Session, asset_id: int, issue: schemas.IssueCreate, actor: str = "Reporter"):
    issue_num = generate_issue_number(db)
    
    db_issue = models.Issue(
        issue_number=issue_num,
        asset_id=asset_id,
        title=issue.title,
        description=issue.description,
        priority=issue.priority,
        category=issue.category,
        reporter_name=issue.reporter_name,
        reporter_contact=issue.reporter_contact,
        status="Reported",
        evidence_url=issue.evidence_url,
        
        # AI Suggestions
        ai_suggested_title=issue.ai_suggested_title,
        ai_suggested_category=issue.ai_suggested_category,
        ai_suggested_priority=issue.ai_suggested_priority,
        ai_possible_causes=issue.ai_possible_causes,
        ai_diagnostic_checks=issue.ai_diagnostic_checks,
        ai_pattern_warning=issue.ai_pattern_warning,
        ai_used=issue.ai_used
    )
    
    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    
    # Business Rule: Update asset status to "Issue Reported"
    asset = get_asset(db, asset_id)
    if asset:
        asset.status = "Issue Reported"
        db.add(asset)
        db.commit()
        
        log_asset_event(
            db,
            asset_id=asset_id,
            actor=actor,
            action="Issue Reported",
            details=f"Issue {issue_num} reported: '{issue.title}'. Asset status set to 'Issue Reported'."
        )
        
    return db_issue

def update_issue(db: Session, db_issue: models.Issue, issue_update: schemas.IssueUpdate, actor: str):
    update_data = issue_update.dict(exclude_unset=True)
    old_status = db_issue.status
    old_tech = db_issue.technician_id
    
    for key, value in update_data.items():
        setattr(db_issue, key, value)
        
    if "status" in update_data and update_data["status"] == "Resolved":
        db_issue.closed_at = datetime.datetime.utcnow()
        
    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    
    asset = get_asset(db, db_issue.asset_id)
    
    # State transitions business logic
    if "status" in update_data and update_data["status"] != old_status:
        new_status = db_issue.status
        
        # Log to asset history
        log_asset_event(
            db,
            asset_id=db_issue.asset_id,
            actor=actor,
            action="Issue Status Changed",
            details=f"Issue {db_issue.issue_number} changed from {old_status} to {new_status}."
        )
        
        # Update asset status based on transitions
        # - Technician begins inspection -> Under Inspection
        # - Repair work begins -> Under Maintenance
        # - Maintenance successfully completed -> Operational
        if new_status == "Inspection Started" and asset:
            asset.status = "Under Inspection"
            db.add(asset)
            db.commit()
            log_asset_event(db, asset.id, actor, "Status Changed", "Asset transitioned to 'Under Inspection' on inspection start.")
            
        elif new_status == "Maintenance In Progress" and asset:
            asset.status = "Under Maintenance"
            db.add(asset)
            db.commit()
            log_asset_event(db, asset.id, actor, "Status Changed", "Asset transitioned to 'Under Maintenance' on repair work start.")
            
        elif new_status == "Resolved" and asset:
            asset.status = "Operational"
            db.add(asset)
            db.commit()
            log_asset_event(db, asset.id, actor, "Status Changed", "Asset transitioned to 'Operational' after issue resolution.")
            
        elif new_status == "Reopened" and asset:
            asset.status = "Issue Reported"
            db.add(asset)
            db.commit()
            log_asset_event(db, asset.id, actor, "Status Changed", "Asset transitioned back to 'Issue Reported' as issue reopened.")

    if "technician_id" in update_data and update_data["technician_id"] != old_tech:
        tech_name = "None"
        if db_issue.technician_id:
            tech = get_user(db, db_issue.technician_id)
            tech_name = tech.username if tech else "Unknown"
        
        # Auto advance status to Assigned
        if db_issue.status == "Reported":
            db_issue.status = "Assigned"
            db.add(db_issue)
            db.commit()
            
        log_asset_event(
            db,
            asset_id=db_issue.asset_id,
            actor=actor,
            action="Issue Assigned",
            details=f"Issue {db_issue.issue_number} assigned to technician: {tech_name}."
        )
        
    return db_issue

# Maintenance Operations
def create_maintenance_record(db: Session, asset_id: int, record: schemas.MaintenanceRecordCreate, actor: str):
    # Rule validation: Cost cannot be negative
    if record.cost < 0:
        raise ValueError("Maintenance cost cannot be negative.")
        
    db_record = models.MaintenanceRecord(
        asset_id=asset_id,
        issue_id=record.issue_id,
        notes=record.notes,
        parts_used=record.parts_used,
        cost=record.cost,
        start_date=record.start_date,
        end_date=record.end_date,
        technician_name=record.technician_name,
        status=record.status
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    
    # Update Asset's last service and next service date
    asset = get_asset(db, asset_id)
    if asset:
        asset.last_service_date = record.end_date
        
        # Calculate Next Service Date (e.g. 6 months out)
        try:
            comp_date = datetime.datetime.strptime(record.end_date, "%Y-%m-%d")
            next_date = comp_date + datetime.timedelta(days=180)
            asset.next_service_date = next_date.strftime("%Y-%m-%d")
        except:
            asset.next_service_date = (datetime.date.today() + datetime.timedelta(days=180)).strftime("%Y-%m-%d")
            
        db.add(asset)
        db.commit()
        
    # Log to History
    log_asset_event(
        db,
        asset_id=asset_id,
        actor=actor,
        action="Maintenance Logged",
        details=f"Maintenance logged by {record.technician_name}. Cost: ${record.cost:.2f}. Parts: {record.parts_used or 'None'}."
    )
    
    return db_record

def get_maintenance_records(db: Session, asset_id: int = None):
    query = db.query(models.MaintenanceRecord)
    if asset_id:
        query = query.filter(models.MaintenanceRecord.asset_id == asset_id)
    return query.order_by(models.MaintenanceRecord.end_date.desc()).all()

# Asset History Queries
def get_asset_history(db: Session, asset_id: int):
    return db.query(models.AssetHistory).filter(models.AssetHistory.asset_id == asset_id).order_by(models.AssetHistory.timestamp.desc()).all()

def get_recent_history(db: Session, limit: int = 15):
    return db.query(models.AssetHistory).order_by(models.AssetHistory.timestamp.desc()).limit(limit).all()

# Dashboard Stats
def get_dashboard_stats(db: Session) -> schemas.DashboardStats:
    total_ast = db.query(func.count(models.Asset.id)).scalar() or 0
    
    # Active issues (Not Resolved or Closed)
    active_iss = db.query(func.count(models.Issue.id)).filter(
        (~models.Issue.status.in_(["Resolved", "Closed"]))
    ).scalar() or 0
    
    # Pending Maintenance: issues assigned but not completed
    pending_maint = db.query(func.count(models.Issue.id)).filter(
        models.Issue.status.in_(["Assigned", "Inspection Started", "Maintenance In Progress", "Waiting For Parts"])
    ).scalar() or 0
    
    # Operational rate: percentage of assets NOT Offline, Out of Service, or Retired
    total_operational_assets = db.query(func.count(models.Asset.id)).filter(
        (~models.Asset.status.in_(["Offline", "Out of Service", "Retired"]))
    ).scalar() or 0
    
    op_rate = (total_operational_assets / total_ast * 100.0) if total_ast > 0 else 100.0
    
    # Category distribution
    categories = db.query(models.Asset.category, func.count(models.Asset.id)).group_by(models.Asset.category).all()
    cat_dist = {cat: count for cat, count in categories if cat}
    
    # Status distribution
    statuses = db.query(models.Asset.status, func.count(models.Asset.id)).group_by(models.Asset.status).all()
    stat_dist = {stat: count for stat, count in statuses if stat}
    
    # Priority distribution
    priorities = db.query(models.Issue.priority, func.count(models.Issue.id)).filter(
        (~models.Issue.status.in_(["Resolved", "Closed"]))
    ).group_by(models.Issue.priority).all()
    prio_dist = {prio: count for prio, count in priorities if prio}
    
    return schemas.DashboardStats(
        total_assets=total_ast,
        active_issues=active_iss,
        pending_maintenance=pending_maint,
        operational_rate=round(op_rate, 1),
        status_distribution=stat_dist,
        priority_distribution=prio_dist,
        category_distribution=cat_dist
    )
