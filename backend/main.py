from fastapi import FastAPI, Depends, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from . import models, schemas, crud
from .database import engine, Base, get_db

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AssetCentral Pro API", version="2.4.0")

# Enable CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup if empty
@app.on_event("startup")
def seed_data():
    db = Session(bind=engine)
    try:
        # Check if assets exist
        if db.query(models.Asset).count() == 0:
            print("Seeding initial mock data...")
            
            # Create Assets
            assets = [
                models.Asset(
                    asset_id="#AC-8842-X",
                    name="Quantum Core Server S2",
                    serial="SN-90210-BC",
                    category="Computing Hardware",
                    status="Online",
                    location="London DC3",
                    value=15420000.00,
                    efficiency=98,
                    last_audited="Oct 12, 2023",
                    description="Primary high-performance computing cluster supporting main operations."
                ),
                models.Asset(
                    asset_id="#AC-1190-V",
                    name="Excavator Series-7",
                    serial="SN-44512-KL",
                    category="Heavy Machinery",
                    status="Maintenance",
                    location="Site North-Alpha",
                    value=345000.00,
                    efficiency=45,
                    last_audited="Sep 28, 2023",
                    description="Institutional mining and excavation mechanical unit."
                ),
                models.Asset(
                    asset_id="#AC-7721-P",
                    name="Power Grid Array B",
                    serial="SN-33881-ZZ",
                    category="Facility Infrastructure",
                    status="Offline",
                    location="Texas Hub",
                    value=4200000.00,
                    efficiency=12,
                    last_audited="Oct 05, 2023",
                    description="Secondary power routing substation and breaker panel array."
                ),
                models.Asset(
                    asset_id="#AC-9005-T",
                    name="Tesla Logistics Unit 04",
                    serial="SN-88229-MA",
                    category="Transportation",
                    status="Online",
                    location="Berlin R&D",
                    value=89000.00,
                    efficiency=94,
                    last_audited="Oct 14, 2023",
                    description="Automated electric short-haul cargo transporter."
                ),
                models.Asset(
                    asset_id="#AC-4432-F",
                    name="Industrial CNC Mill",
                    serial="SN-55122-RR",
                    category="Heavy Machinery",
                    status="Online",
                    location="Detroit Plant B",
                    value=125400.00,
                    efficiency=92,
                    last_audited="Oct 01, 2023",
                    description="Precision automated subtractive manufacturing spindle."
                ),
            ]
            for a in assets:
                db.add(a)
            db.commit()
            
            # Fetch inserted assets to associate maintenance
            quantum_server = db.query(models.Asset).filter(models.Asset.asset_id == "#AC-8842-X").first()
            excavator = db.query(models.Asset).filter(models.Asset.asset_id == "#AC-1190-V").first()
            grid_array = db.query(models.Asset).filter(models.Asset.asset_id == "#AC-7721-P").first()
            
            # Create Maintenance Records
            maintenance = [
                models.MaintenanceRecord(
                    asset_id=excavator.id,
                    description="Hydraulic pressure valve calibration and fluid replacement.",
                    date="Oct 18, 2023",
                    cost=4200.00,
                    status="Scheduled"
                ),
                models.MaintenanceRecord(
                    asset_id=grid_array.id,
                    description="Substation grid coolant replacement and connection check.",
                    date="Oct 06, 2023",
                    cost=18500.00,
                    status="Completed"
                ),
                models.MaintenanceRecord(
                    asset_id=quantum_server.id,
                    description="Standard rack cleaning and fan filter replacements.",
                    date="Nov 02, 2023",
                    cost=1200.00,
                    status="Scheduled"
                )
            ]
            for m in maintenance:
                db.add(m)
                
            # Create Activity Logs
            logs = [
                models.ActivityLog(
                    message="New Asset \"Quantum Core Server S2\" was registered in London DC3.",
                    type="create",
                    severity="Info",
                    timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=5)
                ),
                models.ActivityLog(
                    message="Urgent Alert: Critical efficiency drop detected on Power Grid Array B.",
                    type="alert",
                    severity="Critical",
                    timestamp=datetime.datetime.utcnow() - datetime.timedelta(minutes=15)
                ),
                models.ActivityLog(
                    message="Maintenance Complete: Substation grid coolant replacement on Power Grid Array B.",
                    type="update",
                    severity="Info",
                    timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=1)
                ),
                models.ActivityLog(
                    message="Asset \"Tesla Logistics Unit 04\" details were updated.",
                    type="update",
                    severity="Info",
                    timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=3)
                )
            ]
            for l in logs:
                db.add(l)
                
            db.commit()
            print("Database seeding completed.")
    finally:
        db.close()

# API Endpoints

@app.get("/api/stats", response_model=schemas.DashboardStats)
def read_stats(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)

@app.get("/api/assets", response_model=List[schemas.Asset])
def read_assets(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    status: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    assets = crud.get_assets(db, skip=skip, limit=limit, category=category, status=status, q=q)
    total = crud.count_assets(db, category=category, status=status, q=q)
    response.headers["X-Total-Count"] = str(total)
    return assets

@app.get("/api/assets/{asset_id}", response_model=schemas.Asset)
def read_asset(asset_id: int, db: Session = Depends(get_db)):
    db_asset = crud.get_asset(db, asset_id=asset_id)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset

@app.post("/api/assets", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db)):
    # Check if duplicate custom asset_id
    if asset.asset_id:
        exists = crud.get_asset_by_code(db, asset_code=asset.asset_id)
        if exists:
            raise HTTPException(status_code=400, detail="Asset ID already exists")
    return crud.create_asset(db=db, asset=asset)

@app.put("/api/assets/{asset_id}", response_model=schemas.Asset)
def update_asset(asset_id: int, asset_update: schemas.AssetUpdate, db: Session = Depends(get_db)):
    db_asset = crud.get_asset(db, asset_id=asset_id)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return crud.update_asset(db=db, db_asset=db_asset, asset_update=asset_update)

@app.delete("/api/assets/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    db_asset = crud.get_asset(db, asset_id=asset_id)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    crud.delete_asset(db=db, db_asset=db_asset)
    return {"detail": "Asset deleted successfully"}

@app.post("/api/assets/{asset_id}/maintenance", response_model=schemas.MaintenanceRecord)
def schedule_maintenance(asset_id: int, record: schemas.MaintenanceRecordCreate, db: Session = Depends(get_db)):
    db_asset = crud.get_asset(db, asset_id=asset_id)
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return crud.create_maintenance_record(db=db, record=record, asset_id=asset_id)

@app.get("/api/maintenance", response_model=List[schemas.MaintenanceRecord])
def read_maintenance(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_maintenance_records(db, skip=skip, limit=limit)

@app.get("/api/logs", response_model=List[schemas.ActivityLog])
def read_logs(limit: int = 20, db: Session = Depends(get_db)):
    return crud.get_activity_logs(db, limit=limit)

@app.get("/api/categories", response_model=List[str])
def read_categories(db: Session = Depends(get_db)):
    categories = db.query(models.Asset.category).distinct().all()
    return [c[0] for c in categories if c[0]]

@app.get("/api/locations", response_model=List[str])
def read_locations(db: Session = Depends(get_db)):
    locations = db.query(models.Asset.location).distinct().all()
    return [l[0] for l in locations if l[0]]
