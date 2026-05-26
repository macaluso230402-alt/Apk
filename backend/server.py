from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import motor.motor_asyncio
import uuid
import json
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

app = FastAPI()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")

# Single-user private app — no auth.
DEFAULT_USER_ID = "default-user"

# CORS — include Capacitor Android WebView origins
default_origins = [FRONTEND_URL] if FRONTEND_URL != "*" else ["*"]
capacitor_origins = ["https://localhost", "capacitor://localhost", "http://localhost"]
allowed_origins = list({*default_origins, *capacitor_origins})
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


# ================= MODELS =================
class Location(BaseModel):
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class HomeSituation(BaseModel):
    pets: List[str] = []
    lighting: Optional[str] = None
    space: Optional[str] = None


class CareSchedule(BaseModel):
    water_frequency: Optional[str] = None
    fertilizer_frequency: Optional[str] = None
    pruning_notes: Optional[str] = None


class UserProfile(BaseModel):
    id: str
    name: str
    location: Optional[Location] = None
    home_situation: Optional[HomeSituation] = None


class Plant(BaseModel):
    id: str
    user_id: str
    common_name: str
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    care_schedule: Optional[CareSchedule] = None
    light_requirement: Optional[str] = None
    water_requirement: Optional[str] = None
    pet_friendly: Optional[bool] = None
    propagation: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    added_at: str


class Reminder(BaseModel):
    id: str
    plant_id: str
    user_id: str
    plant_name: str
    type: str
    frequency: str
    last_done: Optional[str] = None
    next_due: str
    enabled: bool


class IdentifyRequest(BaseModel):
    image_base64: str
    location: Optional[Location] = None
    home_situation: Optional[HomeSituation] = None


class IdentifyResponse(BaseModel):
    common_name: str
    scientific_name: Optional[str] = None
    description: str
    care_guide: Dict[str, Any]
    confidence: str
    pet_friendly: Optional[bool] = None
    suitable_for_user: Dict[str, Any]
    propagation: Optional[Dict[str, Any]] = None


class SavePlantRequest(BaseModel):
    common_name: str
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    image_base64: Optional[str] = None
    care_schedule: Optional[CareSchedule] = None
    light_requirement: Optional[str] = None
    water_requirement: Optional[str] = None
    pet_friendly: Optional[bool] = None
    propagation: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    client_id: Optional[str] = None  # idempotency key from offline queue


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    location: Optional[Location] = None
    home_situation: Optional[HomeSituation] = None


class CreateReminderRequest(BaseModel):
    plant_id: str
    type: str
    frequency: str


class UpdateReminderRequest(BaseModel):
    enabled: bool


class RecommendationRequest(BaseModel):
    filters: Optional[Dict[str, Any]] = None


# ================= STARTUP =================
@app.on_event("startup")
async def on_startup():
    await db.plants.create_index([("user_id", 1), ("id", 1)])
    await db.plants.create_index([("user_id", 1), ("client_id", 1)])
    await db.reminders.create_index([("user_id", 1), ("id", 1)])
    await db.profile.create_index("id", unique=True)
    # Ensure single user profile exists
    existing = await db.profile.find_one({"id": DEFAULT_USER_ID})
    if not existing:
        await db.profile.insert_one({
            "id": DEFAULT_USER_ID,
            "name": "Utente",
            "location": None,
            "home_situation": None,
        })


# ================= HEALTH =================
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# ================= PROFILE =================
@app.get("/api/profile", response_model=UserProfile)
async def get_profile():
    profile = await db.profile.find_one({"id": DEFAULT_USER_ID}, {"_id": 0})
    if not profile:
        profile = {"id": DEFAULT_USER_ID, "name": "Utente"}
        await db.profile.insert_one(profile)
    return UserProfile(**profile)


@app.put("/api/profile", response_model=UserProfile)
async def update_profile(req: UpdateProfileRequest):
    update_data = {k: v.dict() if hasattr(v, "dict") else v for k, v in req.dict(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.profile.update_one({"id": DEFAULT_USER_ID}, {"$set": update_data}, upsert=True)
    profile = await db.profile.find_one({"id": DEFAULT_USER_ID}, {"_id": 0})
    return UserProfile(**profile)


# ================= IDENTIFY =================
@app.post("/api/identify", response_model=IdentifyResponse)
async def identify_plant(req: IdentifyRequest):
    try:
        profile = await db.profile.find_one({"id": DEFAULT_USER_ID}, {"_id": 0}) or {}
        loc = req.location or (Location(**profile.get("location")) if profile.get("location") else None)
        home = req.home_situation or (HomeSituation(**profile.get("home_situation")) if profile.get("home_situation") else None)

        context_lines = []
        if loc and loc.city:
            context_lines.append(f"- Posizione utente: {loc.city}")
        if home:
            if home.pets:
                context_lines.append(f"- Animali domestici in casa: {', '.join(home.pets)}")
            if home.lighting:
                context_lines.append(f"- Illuminazione disponibile: {home.lighting}")
            if home.space:
                context_lines.append(f"- Spazio disponibile: {home.space}")
        context_block = "\n".join(context_lines) if context_lines else "(nessun contesto utente fornito)"

        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"identify-{uuid.uuid4()}",
            system_message="Sei un esperto botanico specializzato in piante da interno. Identifica le piante dalle foto e crea guide di cura personalizzate. Rispondi SEMPRE solo con un oggetto JSON valido in italiano, senza markdown, senza ```json, senza testo extra."
        ).with_model("gemini", "gemini-2.5-flash")

        image_content = ImageContent(image_base64=req.image_base64)
        prompt = f"""Analizza l'immagine e identifica la pianta. Considera questo contesto utente:
{context_block}

Rispondi SOLO con questo JSON (senza markdown):
{{
  "common_name": "nome comune in italiano",
  "scientific_name": "nome scientifico latino",
  "description": "breve descrizione (2-3 frasi)",
  "confidence": "Alta|Media|Bassa",
  "pet_friendly": true|false,
  "care_guide": {{
    "water": "frequenza e modo di annaffiare",
    "light": "esigenze di luce",
    "fertilizer": "frequenza fertilizzazione",
    "temperature": "range ideale in °C",
    "tips": "2-3 consigli specifici per il contesto dell'utente"
  }},
  "propagation": {{
    "methods": ["talea in acqua", "talea in terra", "divisione", "seme", "ecc - solo metodi adatti"],
    "difficulty": "Facile|Media|Difficile",
    "best_season": "primavera|estate|autunno|inverno o combinazione",
    "rooting_time": "tempo medio per la radicazione",
    "steps": ["passo 1", "passo 2", "passo 3", "passo 4", "passo 5"],
    "tips": "1-2 consigli pratici specifici"
  }},
  "suitability_score": 1-10,
  "suitability_reasons": ["motivo 1", "motivo 2", "motivo 3"]
}}"""
        response = await chat.send_message(UserMessage(text=prompt, file_contents=[image_content]))

        data = {}
        try:
            data = json.loads(response.strip())
        except (json.JSONDecodeError, AttributeError):
            try:
                m = re.search(r'\{.*\}', response, re.DOTALL)
                if m:
                    data = json.loads(m.group())
            except (json.JSONDecodeError, AttributeError):
                pass

        if not data or "common_name" not in data:
            return IdentifyResponse(
                common_name="Pianta non identificata",
                scientific_name="",
                description="Non è stato possibile identificare la pianta. Prova con una foto più chiara.",
                care_guide={"water": "Annaffiare quando il terreno è asciutto", "light": "Luce indiretta",
                            "fertilizer": "Ogni 2-4 settimane", "temperature": "18-24°C", "tips": ""},
                confidence="Bassa", pet_friendly=None,
                suitable_for_user={"score": 5, "reasons": ["Identificazione non riuscita"]},
            )

        care = data.get("care_guide", {}) or {}
        return IdentifyResponse(
            common_name=data.get("common_name", "Sconosciuta"),
            scientific_name=data.get("scientific_name", ""),
            description=data.get("description", ""),
            care_guide={
                "water": care.get("water", "Informazione non disponibile"),
                "light": care.get("light", "Informazione non disponibile"),
                "fertilizer": care.get("fertilizer", "Non specificato"),
                "temperature": care.get("temperature", "Non specificato"),
                "tips": care.get("tips", ""),
            },
            confidence=data.get("confidence", "Media"),
            pet_friendly=data.get("pet_friendly"),
            propagation=data.get("propagation"),
            suitable_for_user={
                "score": data.get("suitability_score", 7),
                "reasons": data.get("suitability_reasons", ["Pianta identificata"]),
            },
        )
    except Exception as e:
        # Graceful fallback: never leak raw LLM error text; return documented "non identificata" response.
        return IdentifyResponse(
            common_name="Pianta non identificata",
            scientific_name="",
            description=f"Non è stato possibile identificare la pianta. Prova con una foto più chiara, ben illuminata e ravvicinata. ({type(e).__name__})",
            care_guide={"water": "Annaffiare quando il terreno è asciutto", "light": "Luce indiretta",
                        "fertilizer": "Ogni 2-4 settimane", "temperature": "18-24°C", "tips": ""},
            confidence="Bassa", pet_friendly=None,
            suitable_for_user={"score": 5, "reasons": ["Identificazione non riuscita"]},
        )


# ================= PLANTS =================
def _season_now() -> str:
    month = datetime.now(timezone.utc).month
    if month in (3, 4, 5):
        return "primavera"
    if month in (6, 7, 8):
        return "estate"
    if month in (9, 10, 11):
        return "autunno"
    return "inverno"


async def _maybe_create_propagation_reminder(plant: dict) -> None:
    prop = plant.get("propagation")
    if not prop or not prop.get("best_season"):
        return
    best_season = prop["best_season"].lower()
    if _season_now() not in best_season:
        return
    existing = await db.reminders.find_one({"user_id": DEFAULT_USER_ID, "plant_id": plant["id"], "type": "propagation"})
    if existing:
        return
    await db.reminders.insert_one({
        "id": str(uuid.uuid4()),
        "plant_id": plant["id"],
        "user_id": DEFAULT_USER_ID,
        "plant_name": plant["common_name"],
        "type": "propagation",
        "frequency": f"Stagione ideale: {prop['best_season']}",
        "last_done": None,
        "next_due": datetime.now(timezone.utc).isoformat(),
        "enabled": True,
    })


@app.post("/api/plants", response_model=Plant)
async def save_plant(req: SavePlantRequest):
    # Idempotency: if client_id supplied and already saved, return existing
    if req.client_id:
        existing = await db.plants.find_one({"user_id": DEFAULT_USER_ID, "client_id": req.client_id}, {"_id": 0})
        if existing:
            return Plant(**existing)
    plant_id = str(uuid.uuid4())
    plant_dict = {
        "id": plant_id,
        "user_id": DEFAULT_USER_ID,
        "client_id": req.client_id,
        "common_name": req.common_name,
        "scientific_name": req.scientific_name,
        "description": req.description,
        "image_url": f"data:image/jpeg;base64,{req.image_base64}" if req.image_base64 else None,
        "care_schedule": req.care_schedule.dict() if req.care_schedule else None,
        "light_requirement": req.light_requirement,
        "water_requirement": req.water_requirement,
        "pet_friendly": req.pet_friendly,
        "propagation": req.propagation,
        "notes": req.notes,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.plants.insert_one(plant_dict)
    await _maybe_create_propagation_reminder(plant_dict)
    plant_dict.pop("client_id", None)
    return Plant(**plant_dict)


@app.get("/api/plants", response_model=List[Plant])
async def get_my_plants():
    plants = []
    async for plant in db.plants.find({"user_id": DEFAULT_USER_ID}, {"_id": 0, "client_id": 0}):
        plants.append(Plant(**plant))
    return plants


@app.get("/api/plants/{plant_id}", response_model=Plant)
async def get_plant(plant_id: str):
    plant = await db.plants.find_one({"id": plant_id, "user_id": DEFAULT_USER_ID}, {"_id": 0, "client_id": 0})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    return Plant(**plant)


@app.delete("/api/plants/{plant_id}")
async def delete_plant(plant_id: str):
    result = await db.plants.delete_one({"id": plant_id, "user_id": DEFAULT_USER_ID})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plant not found")
    await db.reminders.delete_many({"plant_id": plant_id, "user_id": DEFAULT_USER_ID})
    return {"message": "Plant deleted successfully"}


# ================= REMINDERS =================
@app.post("/api/reminders", response_model=Reminder)
async def create_reminder(req: CreateReminderRequest):
    plant = await db.plants.find_one({"id": req.plant_id, "user_id": DEFAULT_USER_ID}, {"_id": 0})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    reminder = {
        "id": str(uuid.uuid4()),
        "plant_id": req.plant_id,
        "user_id": DEFAULT_USER_ID,
        "plant_name": plant.get("common_name", "Unknown"),
        "type": req.type,
        "frequency": req.frequency,
        "last_done": None,
        "next_due": datetime.now(timezone.utc).isoformat(),
        "enabled": True,
    }
    await db.reminders.insert_one(reminder)
    return Reminder(**reminder)


@app.get("/api/reminders", response_model=List[Reminder])
async def get_my_reminders():
    reminders = []
    async for r in db.reminders.find({"user_id": DEFAULT_USER_ID}, {"_id": 0}):
        reminders.append(Reminder(**r))
    return reminders


@app.put("/api/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, req: UpdateReminderRequest):
    result = await db.reminders.update_one(
        {"id": reminder_id, "user_id": DEFAULT_USER_ID},
        {"$set": {"enabled": req.enabled}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder updated successfully"}


@app.delete("/api/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str):
    result = await db.reminders.delete_one({"id": reminder_id, "user_id": DEFAULT_USER_ID})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}


# ================= PLANT OF THE WEEK =================
PLANT_CATALOG = [
    {"name": "Pothos (Epipremnum aureum)", "description": "Pianta facile da curare, perfetta per principianti. Tollera poca luce.",
     "light": "Bassa-Media", "pet_friendly": False, "difficulty": "Facile",
     "image": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80",
     "fun_fact": "Il Pothos è soprannominato 'pianta del diavolo' perché è quasi impossibile farla morire."},
    {"name": "Sansevieria (Lingua di suocera)", "description": "Pianta resistente che purifica l'aria. Richiede poca acqua.",
     "light": "Bassa-Alta", "pet_friendly": False, "difficulty": "Facile",
     "image": "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?w=600&q=80",
     "fun_fact": "La Sansevieria rilascia ossigeno di notte, ideale in camera da letto."},
    {"name": "Felce di Boston", "description": "Pianta elegante che ama l'umidità. Pet-friendly.",
     "light": "Media", "pet_friendly": True, "difficulty": "Media",
     "image": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80",
     "fun_fact": "Esiste da oltre 350 milioni di anni: ha visto i dinosauri!"},
    {"name": "Monstera Deliciosa", "description": "Pianta trendy con foglie spettacolari. Cresce rapidamente.",
     "light": "Media-Alta", "pet_friendly": False, "difficulty": "Media",
     "image": "https://images.unsplash.com/photo-1545241047-6083a3684587?w=600&q=80",
     "fun_fact": "I suoi frutti maturi sanno di mix tra ananas e banana."},
    {"name": "Chlorophytum (Pianta ragno)", "description": "Pianta purificatrice, sicura per animali. Molto resistente.",
     "light": "Media", "pet_friendly": True, "difficulty": "Facile",
     "image": "https://images.unsplash.com/photo-1572688484438-313a6e50c333?w=600&q=80",
     "fun_fact": "Produce 'piantine bebè' che puoi piantare per creare nuove piante gratis."},
    {"name": "Ficus Lyrata (Fico a foglia di violino)", "description": "Pianta statement per spazi ampi. Richiede luce brillante.",
     "light": "Alta", "pet_friendly": False, "difficulty": "Difficile",
     "image": "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80",
     "fun_fact": "In natura può crescere fino a 15 metri di altezza."},
    {"name": "Calathea Orbifolia", "description": "Foglie a strisce argentate, muove le foglie al tramonto.",
     "light": "Media", "pet_friendly": True, "difficulty": "Media",
     "image": "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=600&q=80",
     "fun_fact": "Le sue foglie si chiudono di notte: viene chiamata 'pianta della preghiera'."},
]


@app.get("/api/plant-of-the-week")
async def plant_of_the_week(request: Request):
    profile = await db.profile.find_one({"id": DEFAULT_USER_ID}, {"_id": 0}) or {}
    pool = PLANT_CATALOG
    if profile.get("home_situation", {}) and profile["home_situation"].get("pets"):
        pet_safe = [p for p in PLANT_CATALOG if p["pet_friendly"]]
        if pet_safe:
            pool = pet_safe

    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    plant = pool[(iso_year * 100 + iso_week) % len(pool)]
    days_ahead = 7 - now.weekday()
    next_reset = (now + timedelta(days=days_ahead)).replace(hour=0, minute=0, second=0, microsecond=0)
    return {"week": f"{iso_year}-W{iso_week:02d}", "next_reset": next_reset.isoformat(), "plant": plant}


# ================= RECOMMENDATIONS =================
@app.post("/api/recommendations")
async def get_recommendations(req: RecommendationRequest):
    recs = [{**p, "difficulty": p["difficulty"]} for p in PLANT_CATALOG]
    filters = req.filters or {}
    if filters.get("pet_friendly"):
        recs = [r for r in recs if r["pet_friendly"]]
    if filters.get("light"):
        recs = [r for r in recs if filters["light"] in r["light"]]
    return {"recommendations": recs}
