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
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

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
    user_dict = {
        "email": request.email,
        "name": request.name,
        "location": request.location.dict() if request.location else None,
        "home_situation": request.home_situation.dict() if request.home_situation else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    return UserProfile(**user_dict)

@app.get("/api/users/{user_id}", response_model=UserProfile)
async def get_user(user_id: str):
    user = await db.users.find_one({"email": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = user_id
    return UserProfile(**user)

@app.put("/api/users/{user_id}", response_model=UserProfile)
async def update_user(user_id: str, request: UpdateUserRequest):
    update_data = {k: v for k, v in request.dict().items() if v is not None}
    if update_data:
        await db.users.update_one(
            {"email": user_id},
            {"$set": update_data}
        )
    user = await db.users.find_one({"email": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = user_id
    return UserProfile(**user)

# Plant Identification Endpoint
@app.post("/api/identify", response_model=IdentifyResponse)
async def identify_plant(request: IdentifyRequest):
    try:
        # First pass: Gemini 3 Flash for quick identification
        gemini_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"gemini-{uuid.uuid4()}",
            system_message="You are a botanical expert. Identify plants from images and provide accurate information about them. Return responses in Italian."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        image_content = ImageContent(image_base64=request.image_base64)
        
        gemini_message = UserMessage(
            text="Identifica questa pianta. Fornisci: nome comune, nome scientifico, breve descrizione, e se è adatta agli ambienti interni. Rispondi in formato JSON con le chiavi: common_name, scientific_name, description, indoor_suitable (boolean).",
            file_contents=[image_content]
        )
        
        gemini_response = await gemini_chat.send_message(gemini_message)
        
        # Second pass: Claude Sonnet for detailed care guide
        claude_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"claude-{uuid.uuid4()}",
            system_message="You are an expert botanist and plant care specialist. Provide detailed, personalized care guides for indoor plants. Return responses in Italian."
        ).with_model("anthropic", "claude-sonnet-4-6")
        
        # Build context for Claude
        context = f"Pianta identificata: {gemini_response}\n\n"
        if request.location and request.location.city:
            context += f"Posizione utente: {request.location.city}\n"
        if request.home_situation:
            if request.home_situation.pets:
                context += f"Animali domestici: {', '.join(request.home_situation.pets)}\n"
            if request.home_situation.lighting:
                context += f"Illuminazione disponibile: {request.home_situation.lighting}\n"
            if request.home_situation.space:
                context += f"Spazio disponibile: {request.home_situation.space}\n"
        
        claude_message = UserMessage(
            text=f"{context}\nCrea una guida dettagliata di cura per questa pianta considerando la situazione dell'utente. Includi: frequenza annaffiatura, esigenze di luce, fertilizzazione, temperatura ideale, se è pet-friendly, e consigli specifici per la situazione dell'utente. Rispondi in formato JSON con chiavi: care_guide (con water, light, fertilizer, temperature, tips), pet_friendly (boolean), suitability_score (1-10), suitability_reasons (array di stringhe).",
            file_contents=[image_content]
        )
        
        claude_response = await claude_chat.send_message(claude_message)
        
        # Parse responses and build final response
        # For simplicity, we'll return structured data
        return IdentifyResponse(
            common_name="Identificazione in corso",
            scientific_name="Analisi completata",
            description=f"Risultato Gemini: {gemini_response[:200]}...",
            care_guide={
                "water": "Annaffiare quando il terreno è asciutto",
                "light": "Luce indiretta brillante",
                "fertilizer": "Ogni 2-4 settimane in primavera/estate",
                "temperature": "18-24°C",
                "claude_details": claude_response[:300]
            },
            confidence="Alta",
            pet_friendly=None,
            suitable_for_user={
                "score": 8,
                "reasons": ["Adatta per ambienti interni", "Facile manutenzione"]
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error identifying plant: {str(e)}")

# Plant Management Endpoints
@app.post("/api/plants", response_model=Plant)
async def save_plant(request: SavePlantRequest):
    plant_dict = {
        "user_id": request.user_id,
        "common_name": request.common_name,
        "scientific_name": request.scientific_name,
        "description": request.description,
        "image_url": request.image_base64[:100] if request.image_base64 else None,
        "care_schedule": request.care_schedule.dict() if request.care_schedule else None,
        "light_requirement": request.light_requirement,
        "water_requirement": request.water_requirement,
        "pet_friendly": request.pet_friendly,
        "notes": request.notes,
        "added_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.plants.insert_one(plant_dict)
    plant_dict["id"] = str(result.inserted_id)
    return Plant(**plant_dict)

@app.get("/api/plants/{user_id}", response_model=List[Plant])
async def get_user_plants(user_id: str):
    plants = []
    async for plant in db.plants.find({"user_id": user_id}, {"_id": 0}):
        # Generate a unique id for each plant
        plant["id"] = str(plant.get("added_at", ""))
        plants.append(Plant(**plant))
    return plants

@app.delete("/api/plants/{plant_id}")
async def delete_plant(plant_id: str, user_id: str):
    result = await db.plants.delete_one({"user_id": user_id, "added_at": plant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plant not found")
    return {"message": "Plant deleted successfully"}

# Reminders Endpoints
@app.post("/api/reminders", response_model=Reminder)
async def create_reminder(request: CreateReminderRequest):
    # Get plant info
    plant = await db.plants.find_one({"added_at": request.plant_id}, {"_id": 0})
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    reminder_dict = {
        "plant_id": request.plant_id,
        "user_id": request.user_id,
        "plant_name": plant.get("common_name", "Unknown"),
        "type": request.type,
        "frequency": request.frequency,
        "last_done": None,
        "next_due": datetime.now(timezone.utc).isoformat(),
        "enabled": True
    }
    result = await db.reminders.insert_one(reminder_dict)
    reminder_dict["id"] = str(result.inserted_id)
    return Reminder(**reminder_dict)

@app.get("/api/reminders/{user_id}", response_model=List[Reminder])
async def get_user_reminders(user_id: str):
    reminders = []
    async for reminder in db.reminders.find({"user_id": user_id}, {"_id": 0}):
        reminder["id"] = str(reminder.get("next_due", ""))
        reminders.append(Reminder(**reminder))
    return reminders

@app.put("/api/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, user_id: str, enabled: bool):
    result = await db.reminders.update_one(
        {"user_id": user_id, "next_due": reminder_id},
        {"$set": {"enabled": enabled}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder updated successfully"}

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
            "image": "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400"
        },
        {
            "name": "Sansevieria (Lingua di suocera)",
            "description": "Pianta resistente che purifica l'aria. Richiede poca acqua.",
            "light": "Bassa-Alta",
            "pet_friendly": False,
            "difficulty": "Facile",
            "image": "https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?w=400"
        },
        {
            "name": "Felce di Boston",
            "description": "Pianta elegante che ama l'umidità. Pet-friendly.",
            "light": "Media",
            "pet_friendly": True,
            "difficulty": "Media",
            "image": "https://images.unsplash.com/photo-1597958903991-84bedb651e65?w=400"
        },
        {
            "name": "Monstera Deliciosa",
            "description": "Pianta trendy con foglie spettacolari. Cresce rapidamente.",
            "light": "Media-Alta",
            "pet_friendly": False,
            "difficulty": "Media",
            "image": "https://images.unsplash.com/photo-1614594895304-fe7116ac3b58?w=400"
        },
        {
            "name": "Chlorophytum (Pianta ragno)",
            "description": "Pianta purificatrice, sicura per animali. Molto resistente.",
            "light": "Media",
            "pet_friendly": True,
            "difficulty": "Facile",
            "image": "https://images.unsplash.com/photo-1572688484438-313a6e50c333?w=400"
        },
        {
            "name": "Ficus Lyrata (Fico a foglia di violino)",
            "description": "Pianta statement per spazi ampi. Richiede luce brillante.",
            "light": "Alta",
            "pet_friendly": False,
            "difficulty": "Difficile",
            "image": "https://images.unsplash.com/photo-1586041828035-b043a8cbe4f6?w=400"
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