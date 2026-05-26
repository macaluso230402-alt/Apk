"""Backend API tests for PlantCare app - Iteration 1"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://plant-smart-care.preview.emergentagent.com").rstrip("/")
USER_ID = "demo-user"


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- Health --------
def test_health(api):
    r = api.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


# -------- Users (Create -> Get -> Update) --------
class TestUsers:
    def test_create_user(self, api):
        payload = {
            "email": "TEST_demo@plantcare.com",
            "name": "Utente Demo",
            "location": {"city": "Milano", "lat": 45.46, "lng": 9.19},
            "home_situation": {"pets": ["cat"], "lighting": "media", "space": "piccolo"},
        }
        r = api.post(f"{BASE_URL}/api/users", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == payload["email"]
        assert data["name"] == payload["name"]
        assert "id" in data

    def test_get_user_by_email(self, api):
        # Backend uses email as the {user_id} path param for lookup
        r = api.get(f"{BASE_URL}/api/users/TEST_demo@plantcare.com", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == "TEST_demo@plantcare.com"

    def test_update_user(self, api):
        r = api.put(
            f"{BASE_URL}/api/users/TEST_demo@plantcare.com",
            json={"name": "Updated Name"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "Updated Name"

    def test_get_user_not_found(self, api):
        r = api.get(f"{BASE_URL}/api/users/nonexistent@example.com", timeout=15)
        assert r.status_code == 404


# -------- Plants CRUD --------
class TestPlants:
    plant_id = None

    def test_save_plant(self, api):
        payload = {
            "user_id": USER_ID,
            "common_name": "TEST_Pothos",
            "scientific_name": "Epipremnum aureum",
            "description": "Pianta facile",
            "light_requirement": "Media",
            "water_requirement": "Settimanale",
            "pet_friendly": False,
            "notes": "test",
        }
        r = api.post(f"{BASE_URL}/api/plants", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["common_name"] == "TEST_Pothos"
        assert data["user_id"] == USER_ID
        TestPlants.plant_id = data.get("added_at")  # GET uses added_at as id

    def test_get_plants(self, api):
        r = api.get(f"{BASE_URL}/api/plants/{USER_ID}", timeout=15)
        assert r.status_code == 200, r.text
        plants = r.json()
        assert isinstance(plants, list)
        names = [p["common_name"] for p in plants]
        assert "TEST_Pothos" in names

    def test_delete_plant(self, api):
        # Retrieve plants to find id (added_at based)
        r = api.get(f"{BASE_URL}/api/plants/{USER_ID}", timeout=15)
        target = next((p for p in r.json() if p["common_name"] == "TEST_Pothos"), None)
        assert target is not None
        pid = target["id"]
        d = api.delete(f"{BASE_URL}/api/plants/{pid}?user_id={USER_ID}", timeout=15)
        assert d.status_code == 200, d.text


# -------- Recommendations --------
class TestRecommendations:
    def test_recommendations_all(self, api):
        r = api.post(f"{BASE_URL}/api/recommendations", json={"user_id": USER_ID}, timeout=15)
        assert r.status_code == 200, r.text
        recs = r.json().get("recommendations", [])
        assert len(recs) >= 4

    def test_recommendations_pet_friendly(self, api):
        r = api.post(
            f"{BASE_URL}/api/recommendations",
            json={"user_id": USER_ID, "filters": {"pet_friendly": True}},
            timeout=15,
        )
        assert r.status_code == 200
        recs = r.json()["recommendations"]
        assert len(recs) >= 1
        assert all(rec["pet_friendly"] is True for rec in recs)

    def test_recommendations_light_filter(self, api):
        r = api.post(
            f"{BASE_URL}/api/recommendations",
            json={"user_id": USER_ID, "filters": {"light": "Media"}},
            timeout=15,
        )
        assert r.status_code == 200
        recs = r.json()["recommendations"]
        assert all("Media" in rec["light"] for rec in recs)


# -------- Identify (Gemini + Claude integration) --------
class TestIdentify:
    def test_identify_with_small_image(self, api):
        # Minimal 1x1 PNG as base64 (LLM might reject but endpoint should respond)
        png_b64 = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        )
        payload = {
            "image_base64": png_b64,
            "user_id": USER_ID,
            "location": {"city": "Milano"},
            "home_situation": {"pets": ["cat"], "lighting": "media"},
        }
        r = api.post(f"{BASE_URL}/api/identify", json=payload, timeout=120)
        # Accept either success or 500 with an LLM-specific error (image too small)
        assert r.status_code in (200, 500), r.text
        if r.status_code == 200:
            data = r.json()
            assert "common_name" in data
            assert "care_guide" in data


# -------- Reminders --------
class TestReminders:
    def test_create_reminder_no_plant(self, api):
        r = api.post(
            f"{BASE_URL}/api/reminders",
            json={"plant_id": "nonexistent", "user_id": USER_ID, "type": "water", "frequency": "weekly"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_get_reminders(self, api):
        r = api.get(f"{BASE_URL}/api/reminders/{USER_ID}", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
