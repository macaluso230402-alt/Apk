from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from dotenv import load_dotenv
import os
import motor.motor_asyncio
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
import uuid

load_dotenv()

app = FastAPI()

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic Models for Response (no ObjectId)
class Location(BaseModel):
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class HomeSituation(BaseModel):
    pets: List[str] = []
    lighting: Optional[str] = None
    space: Optional[str] = None

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    location: Optional[Location] = None
    home_situation: Optional[HomeSituation] = None
    created_at: str

class CareSchedule(BaseModel):
    water_frequency: Optional[str] = None
    fertilizer_frequency: Optional[str] = None
    pruning_notes: Optional[str] = None

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
    user_id: str
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

class SavePlantRequest(BaseModel):
    user_id: str
    common_name: str
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    image_base64: Optional[str] = None
    care_schedule: Optional[CareSchedule] = None
    light_requirement: Optional[str] = None
    water_requirement: Optional[str] = None
    pet_friendly: Optional[bool] = None
    notes: Optional[str] = None

class CreateUserRequest(BaseModel):
    email: str
    name: str
    location: Optional[Location] = None
    home_situation: Optional[HomeSituation] = None

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    location: Optional[Location] = None
    home_situation: Optional[HomeSituation] = None

class RecommendationRequest(BaseModel):
    user_id: str
    filters: Optional[Dict[str, Any]] = None

class CreateReminderRequest(BaseModel):
    plant_id: str
    user_id: str
    type: str
    frequency: str

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

# User Profile Endpoints
@app.post("/api/users", response_model=UserProfile)
async def create_user(request: CreateUserRequest):
    user_id = str(uuid.uuid4())
    user_dict = {
        "id": user_id,
        "email": request.email,
        "name": request.name,
        "location": request.location.dict() if request.location else None,
        "home_situation": request.home_situation.dict() if request.home_situation else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_dict)
    return UserProfile(**user_dict)

@app.get("/api/users/{user_id}", response_model=UserProfile)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**user)

@app.put("/api/users/{user_id}", response_model=UserProfile)
async def update_user(user_id: str, request: UpdateUserRequest):
    update_data = {k: v for k, v in request.dict().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**user)

# Plant Identification Endpoint
@app.post("/api/identify", response_model=IdentifyResponse)
async def identify_plant(request: IdentifyRequest):
    try:
        import json
        import re
        
        # Build personalization context
        context_lines = []
        if request.location and request.location.city:
            context_lines.append(f"- Posizione utente: {request.location.city}")
        if request.home_situation:
            if request.home_situation.pets:
                context_lines.append(f"- Animali domestici in casa: {', '.join(request.home_situation.pets)}")
            if request.home_situation.lighting:
                context_lines.append(f"- Illuminazione disponibile: {request.home_situation.lighting}")
            if request.home_situation.space:
                context_lines.append(f"- Spazio disponibile: {request.home_situation.space}")
        context_block = "\n".join(context_lines) if context_lines else "(nessun contesto utente fornito)"
        
        # Single Gemini call for identification + personalized care guide
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"identify-{uuid.uuid4()}",
            system_message="Sei un esperto botanico specializzato in piante da interno. Identifica le piante dalle foto e crea guide di cura personalizzate. Rispondi SEMPRE solo con un oggetto JSON valido in italiano, senza markdown, senza ```json, senza testo extra."
        ).with_model("gemini", "gemini-2.5-flash")
        
        image_content = ImageContent(image_base64=request.image_base64)
        
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
  "suitability_score": 1-10,
  "suitability_reasons": ["motivo 1 breve", "motivo 2 breve", "motivo 3 breve"]
}}"""
        
        message = UserMessage(text=prompt, file_contents=[image_content])
        response = await chat.send_message(message)
        
        # Parse JSON response
        data = {}
        try:
            # Try direct parse
            data = json.loads(response.strip())
        except (json.JSONDecodeError, AttributeError):
            try:
                # Extract JSON block with greedy match
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
            except (json.JSONDecodeError, AttributeError):
                pass
        
        if not data or "common_name" not in data:
            # Graceful fallback
            return IdentifyResponse(
                common_name="Pianta non identificata",
                scientific_name="",
                description="Non è stato possibile identificare la pianta dall'immagine. Prova con una foto più chiara o ben illuminata.",
                care_guide={
                    "water": "Annaffiare quando il terreno è asciutto al tatto",
                    "light": "Luce indiretta brillante",
                    "fertilizer": "Ogni 2-4 settimane in primavera/estate",
                    "temperature": "18-24°C",
                    "tips": "Monitorare la pianta regolarmente"
                },
                confidence="Bassa",
                pet_friendly=None,
                suitable_for_user={"score": 5, "reasons": ["Identificazione non riuscita"]}
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
                "tips": care.get("tips", "")
            },
            confidence=data.get("confidence", "Media"),
            pet_friendly=data.get("pet_friendly"),
            suitable_for_user={
                "score": data.get("suitability_score", 7),
                "reasons": data.get("suitability_reasons", ["Pianta identificata"])
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error identifying plant: {str(e)}")

# Plant Management Endpoints
@app.post("/api/plants", response_model=Plant)
async def save_plant(request: SavePlantRequest):
    plant_id = str(uuid.uuid4())
    plant_dict = {
        "id": plant_id,
        "user_id": request.user_id,
        "common_name": request.common_name,
        "scientific_name": request.scientific_name,
        "description": request.description,
        "image_url": f"data:image/jpeg;base64,{request.image_base64}" if request.image_base64 else None,
        "care_schedule": request.care_schedule.dict() if request.care_schedule else None,
        "light_requirement": request.light_requirement,
        "water_requirement": request.water_requirement,
        "pet_friendly": request.pet_friendly,
        "notes": request.notes,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    await db.plants.insert_one(plant_dict)
    return Plant(**plant_dict)

@app.get("/api/plants/{user_id}", response_model=List[Plant])
async def get_user_plants(user_id: str):
    plants = []
    async for plant in db.plants.find({"user_id": user_id}, {"_id": 0}):
        plants.append(Plant(**plant))
    return plants

@app.delete("/api/plants/{plant_id}")
async def delete_plant(plant_id: str, user_id: str):
    result = await db.plants.delete_one({"id": plant_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plant not found")
    return {"message": "Plant deleted successfully"}

# Reminders Endpoints
@app.post("/api/reminders", response_model=Reminder)
async def create_reminder(request: CreateReminderRequest):
    # Get plant info
    plant = await db.plants.find_one({"id": request.plant_id}, {"_id": 0})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    reminder_id = str(uuid.uuid4())
    reminder_dict = {
        "id": reminder_id,
        "plant_id": request.plant_id,
        "user_id": request.user_id,
        "plant_name": plant.get("common_name", "Unknown"),
        "type": request.type,
        "frequency": request.frequency,
        "last_done": None,
        "next_due": datetime.now(timezone.utc).isoformat(),
        "enabled": True
    }
    await db.reminders.insert_one(reminder_dict)
    return Reminder(**reminder_dict)

@app.get("/api/reminders/{user_id}", response_model=List[Reminder])
async def get_user_reminders(user_id: str):
    reminders = []
    async for reminder in db.reminders.find({"user_id": user_id}, {"_id": 0}):
        reminders.append(Reminder(**reminder))
    return reminders

class UpdateReminderRequest(BaseModel):
    enabled: bool

@app.put("/api/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, user_id: str, request: UpdateReminderRequest):
    result = await db.reminders.update_one(
        {"id": reminder_id, "user_id": user_id},
        {"$set": {"enabled": request.enabled}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder updated successfully"}

@app.get("/api/plant-of-the-week")
async def plant_of_the_week(user_id: Optional[str] = None):
    """Returns a curated plant for the current ISO week. If user_id is provided and the user has pets,
    only pet-friendly plants are considered."""
    catalog = [
        {
            "name": "Pothos (Epipremnum aureum)",
            "description": "Pianta facile da curare, perfetta per principianti. Tollera poca luce.",
            "light": "Bassa-Media",
            "pet_friendly": False,
            "difficulty": "Facile",
            "image": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=600&q=80",
            "fun_fact": "Il Pothos è soprannominato 'pianta del diavolo' perché è quasi impossibile farla morire."
        },
        {
            "name": "Sansevieria (Lingua di suocera)",
            "description": "Pianta resistente che purifica l'aria. Richiede poca acqua.",
            "light": "Bassa-Alta",
            "pet_friendly": False,
            "difficulty": "Facile",
            "image": "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?w=600&q=80",
            "fun_fact": "La Sansevieria rilascia ossigeno di notte, ideale in camera da letto."
        },
        {
            "name": "Felce di Boston",
            "description": "Pianta elegante che ama l'umidità. Pet-friendly.",
            "light": "Media",
            "pet_friendly": True,
            "difficulty": "Media",
            "image": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&q=80",
            "fun_fact": "Esiste da oltre 350 milioni di anni: ha visto i dinosauri!"
        },
        {
            "name": "Monstera Deliciosa",
            "description": "Pianta trendy con foglie spettacolari. Cresce rapidamente.",
            "light": "Media-Alta",
            "pet_friendly": False,
            "difficulty": "Media",
            "image": "https://images.unsplash.com/photo-1545241047-6083a3684587?w=600&q=80",
            "fun_fact": "I suoi frutti maturi sanno di mix tra ananas e banana."
        },
        {
            "name": "Chlorophytum (Pianta ragno)",
            "description": "Pianta purificatrice, sicura per animali. Molto resistente.",
            "light": "Media",
            "pet_friendly": True,
            "difficulty": "Facile",
            "image": "https://images.unsplash.com/photo-1572688484438-313a6e50c333?w=600&q=80",
            "fun_fact": "Produce 'piantine bebè' che puoi piantare per creare nuove piante gratis."
        },
        {
            "name": "Ficus Lyrata (Fico a foglia di violino)",
            "description": "Pianta statement per spazi ampi. Richiede luce brillante.",
            "light": "Alta",
            "pet_friendly": False,
            "difficulty": "Difficile",
            "image": "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=600&q=80",
            "fun_fact": "In natura può crescere fino a 15 metri di altezza."
        },
        {
            "name": "Calathea Orbifolia",
            "description": "Foglie a strisce argentate, muove le foglie al tramonto.",
            "light": "Media",
            "pet_friendly": True,
            "difficulty": "Media",
            "image": "https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=600&q=80",
            "fun_fact": "Le sue foglie si chiudono di notte: viene chiamata 'pianta della preghiera'."
        }
    ]
    
    # Filter for pet-safe if user has pets
    pool = catalog
    if user_id:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user and user.get("home_situation", {}).get("pets"):
            pet_safe = [p for p in catalog if p["pet_friendly"]]
            if pet_safe:
                pool = pet_safe
    
    # Deterministic pick by ISO week
    now = datetime.now(timezone.utc)
    iso_year, iso_week, _ = now.isocalendar()
    plant = pool[(iso_year * 100 + iso_week) % len(pool)]
    
    # Compute next reset date (next Monday)
    from datetime import timedelta
    days_ahead = 7 - now.weekday()
    next_reset = (now + timedelta(days=days_ahead)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    return {
        "week": f"{iso_year}-W{iso_week:02d}",
        "next_reset": next_reset.isoformat(),
        "plant": plant
    }

# Recommendations Endpoint
@app.post("/api/recommendations")
async def get_recommendations(request: RecommendationRequest):
    # Static recommendations for MVP
    recommendations = [
        {
            "name": "Pothos (Epipremnum aureum)",
            "description": "Pianta facile da curare, perfetta per principianti. Tollera poca luce.",
            "light": "Bassa-Media",
            "pet_friendly": False,
            "difficulty": "Facile",
            "image": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&q=80"
        },
        {
            "name": "Sansevieria (Lingua di suocera)",
            "description": "Pianta resistente che purifica l'aria. Richiede poca acqua.",
            "light": "Bassa-Alta",
            "pet_friendly": False,
            "difficulty": "Facile",
            "image": "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?w=400&q=80"
        },
        {
            "name": "Felce di Boston",
            "description": "Pianta elegante che ama l'umidità. Pet-friendly.",
            "light": "Media",
            "pet_friendly": True,
            "difficulty": "Media",
            "image": "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&q=80"
        },
        {
            "name": "Monstera Deliciosa",
            "description": "Pianta trendy con foglie spettacolari. Cresce rapidamente.",
            "light": "Media-Alta",
            "pet_friendly": False,
            "difficulty": "Media",
            "image": "https://images.unsplash.com/photo-1545241047-6083a3684587?w=400&q=80"
        },
        {
            "name": "Chlorophytum (Pianta ragno)",
            "description": "Pianta purificatrice, sicura per animali. Molto resistente.",
            "light": "Media",
            "pet_friendly": True,
            "difficulty": "Facile",
            "image": "https://images.unsplash.com/photo-1572688484438-313a6e50c333?w=400&q=80"
        },
        {
            "name": "Ficus Lyrata (Fico a foglia di violino)",
            "description": "Pianta statement per spazi ampi. Richiede luce brillante.",
            "light": "Alta",
            "pet_friendly": False,
            "difficulty": "Difficile",
            "image": "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&q=80"
        }
    ]
    
    # Filter by pet_friendly if user has pets
    if request.filters and request.filters.get("pet_friendly"):
        recommendations = [r for r in recommendations if r["pet_friendly"]]
    
    # Filter by light requirement
    if request.filters and request.filters.get("light"):
        light_filter = request.filters["light"]
        recommendations = [r for r in recommendations if light_filter in r["light"]]
    
    return {"recommendations": recommendations}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)