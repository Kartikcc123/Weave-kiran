import os
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = "fabric_ai"

class Database:
    def __init__(self):
        self.client = None
        self.db = None
        self.connected = False

    async def connect(self):
        try:
            self.client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
            # Verify connection
            await self.client.admin.command('ping')
            self.db = self.client[DB_NAME]
            self.connected = True
            print("[DATABASE] Connected to MongoDB successfully.")
            
            # Create indexes
            await self.db.defects.create_index("event_id", unique=True)
            await self.db.defects.create_index("timestamp")
            await self.db.defects.create_index("defect_type")
            await self.db.defects.create_index("severity")
            
        except Exception as e:
            print(f"[DATABASE ERROR] Failed to connect to MongoDB: {e}")
            self.connected = False

    def disconnect(self):
        if self.client:
            self.client.close()
            self.connected = False

    async def save_defect_event(self, event_data):
        if not self.connected:
            print("[DATABASE] Failed to save defect event (DATABASE OFFLINE)")
            return False
            
        try:
            event_data["created_at"] = datetime.now()
            # Ensure timestamp is a Date object if it's string
            if isinstance(event_data.get("timestamp"), str):
                event_data["timestamp"] = datetime.fromisoformat(event_data["timestamp"])
                
            await self.db.defects.update_one(
                {"event_id": event_data["event_id"]},
                {"$setOnInsert": event_data},
                upsert=True
            )
            print(f"[DATABASE] Saved event_id={event_data['event_id']}")
            return True
        except Exception as e:
            print(f"[DATABASE ERROR] Failed to save defect event: {e}")
            return False

    async def update_defect_status(self, event_id, status, max_confidence=None, severity=None):
        if not self.connected:
            return False
            
        try:
            update_data = {"status": status}
            if status == "CLOSED":
                update_data["closed_at"] = datetime.now()
            if max_confidence is not None:
                update_data["confidence"] = max_confidence
            if severity is not None:
                update_data["severity"] = severity
                
            await self.db.defects.update_one(
                {"event_id": event_id},
                {"$set": update_data}
            )
            print(f"[DATABASE] Updated/Closed event_id={event_id}")
            return True
        except Exception as e:
            print(f"[DATABASE ERROR] Failed to update defect event: {e}")
            return False

    async def get_recent_defects(self, limit=50):
        if not self.connected:
            return []
            
        try:
            cursor = self.db.defects.find().sort("timestamp", -1).limit(limit)
            defects = await cursor.to_list(length=limit)
            for d in defects:
                d["_id"] = str(d["_id"])
            return defects
        except Exception as e:
            print(f"[DATABASE ERROR] Failed to get recent defects: {e}")
            return []
            
    async def get_today_defects(self):
        if not self.connected:
            return []
            
        try:
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            cursor = self.db.defects.find({"timestamp": {"$gte": today}}).sort("timestamp", -1)
            defects = await cursor.to_list(length=1000)
            for d in defects:
                d["_id"] = str(d["_id"])
            return defects
        except Exception as e:
            print(f"[DATABASE ERROR] Failed to get today defects: {e}")
            return []

    async def get_stats(self):
        if not self.connected:
            return {
                "total_defects": 0,
                "major_defects": 0,
                "defect_counts": {}
            }
            
        try:
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Count total for today
            total = await self.db.defects.count_documents({"timestamp": {"$gte": today}})
            
            # Count major for today
            major = await self.db.defects.count_documents({
                "timestamp": {"$gte": today},
                "severity": "HIGH"
            })
            
            # Aggregate by type for today
            pipeline = [
                {"$match": {"timestamp": {"$gte": today}}},
                {"$group": {"_id": "$defect_type", "count": {"$sum": 1}}}
            ]
            type_counts = await self.db.defects.aggregate(pipeline).to_list(length=100)
            counts_dict = {t["_id"]: t["count"] for t in type_counts}
            
            return {
                "total_defects": total,
                "major_defects": major,
                "defect_counts": counts_dict
            }
        except Exception as e:
            print(f"[DATABASE ERROR] Failed to get stats: {e}")
            return {
                "total_defects": 0,
                "major_defects": 0,
                "defect_counts": {}
            }

db = Database()
