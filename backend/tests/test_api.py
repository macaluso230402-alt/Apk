"""PlantCare API regression tests - iteration 2"""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://plant-smart-care.preview.emergentagent.com").rstrip("/")

# 1x1 PNG image base64 (minimal valid)
TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)

created_ids = {"user": None, "plant": None, "reminder": None}


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
def test_health(api):
    r = api.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


# ---------- Users CRUD with uuid4 ----------
def test_create_user(api):
    payload = {
        "email": "TEST_user@plantcare.com",
        "name": "TEST User",
        "location": {"city": "Milano", "lat": 45.46, "lng": 9.19},
        "home_situation": {"pets": ["cat"], "lighting": "bright", "space": "small"},
    }
    r = api.post(f"{BASE_URL}/api/users", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == payload["email"]
    assert data["name"] == payload["name"]
    assert isinstance(data["id"], str) and len(data["id"]) >= 32
    created_ids["user"] = data["id"]


def test_get_user(api):
    assert created_ids["user"]
    r = api.get(f"{BASE_URL}/api/users/{created_ids['user']}", timeout=15)
    assert r.status_code == 200
    assert r.json()["id"] == created_ids["user"]


def test_update_user(api):
    assert created_ids["user"]
    r = api.put(
        f"{BASE_URL}/api/users/{created_ids['user']}",
        json={"name": "TEST Updated"},
        timeout=15,
    )
    assert r.status_code == 200
    assert r.json()["name"] == "TEST Updated"


def test_get_user_404(api):
    r = api.get(f"{BASE_URL}/api/users/nonexistent-uuid-xxx", timeout=15)
    assert r.status_code == 404


# ---------- Plants CRUD ----------
def test_save_plant(api):
    assert created_ids["user"]
    payload = {
        "user_id": created_ids["user"],
        "common_name": "TEST Pothos",
        "scientific_name": "Epipremnum aureum",
        "description": "Test plant",
        "image_base64": TINY_PNG_B64,
        "care_schedule": {
            "water_frequency": "weekly",
            "fertilizer_frequency": "monthly",
            "pruning_notes": "rarely",
        },
        "light_requirement": "Media",
        "water_requirement": "Bassa",
        "pet_friendly": False,
        "notes": "test",
    }
    r = api.post(f"{BASE_URL}/api/plants", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data["id"], str) and len(data["id"]) >= 32
    assert data["user_id"] == created_ids["user"]
    assert data["common_name"] == "TEST Pothos"
    created_ids["plant"] = data["id"]


def test_get_user_plants(api):
    r = api.get(f"{BASE_URL}/api/plants/{created_ids['user']}", timeout=15)
    assert r.status_code == 200
    plants = r.json()
    assert isinstance(plants, list)
    assert any(p["id"] == created_ids["plant"] for p in plants)


# ---------- Reminders ----------
def test_create_reminder(api):
    assert created_ids["plant"]
    payload = {
        "plant_id": created_ids["plant"],
        "user_id": created_ids["user"],
        "type": "water",
        "frequency": "weekly",
    }
    r = api.post(f"{BASE_URL}/api/reminders", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data["id"], str) and len(data["id"]) >= 32
    assert data["enabled"] == True
    created_ids["reminder"] = data["id"]


def test_get_reminders(api):
    r = api.get(f"{BASE_URL}/api/reminders/{created_ids['user']}", timeout=15)
    assert r.status_code == 200
    reminders = r.json()
    assert any(rm["id"] == created_ids["reminder"] for rm in reminders)


def test_update_reminder_with_json_body(api):
    """FIXED: PUT /api/reminders now accepts JSON body {enabled: bool}"""
    assert created_ids["reminder"]
    r = api.put(
        f"{BASE_URL}/api/reminders/{created_ids['reminder']}?user_id={created_ids['user']}",
        json={"enabled": False},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    # Verify persistence via GET
    g = api.get(f"{BASE_URL}/api/reminders/{created_ids['user']}", timeout=15)
    rm = next((x for x in g.json() if x["id"] == created_ids["reminder"]), None)
    assert rm is not None
    assert rm["enabled"] == False


# ---------- Recommendations ----------
def test_recommendations(api):
    r = api.post(
        f"{BASE_URL}/api/recommendations",
        json={"user_id": created_ids["user"] or "demo-user", "filters": {}},
        timeout=15,
    )
    assert r.status_code == 200
    recs = r.json().get("recommendations", [])
    assert len(recs) >= 5
    for rec in recs:
        assert "image" in rec and rec["image"].startswith("http")
        assert "name" in rec


def test_recommendations_pet_filter(api):
    r = api.post(
        f"{BASE_URL}/api/recommendations",
        json={"user_id": "demo-user", "filters": {"pet_friendly": True}},
        timeout=15,
    )
    assert r.status_code == 200
    recs = r.json()["recommendations"]
    assert all(rec["pet_friendly"] for rec in recs)


# ---------- Plant identification (real LLM call) ----------
def test_identify_plant_real_image():
    """End-to-end plant identification via Gemini + Claude."""
    # Use a real small plant image to keep AI happy
    img_url = "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&q=60"
    img_resp = requests.get(img_url, timeout=30)
    assert img_resp.status_code == 200
    img_b64 = base64.b64encode(img_resp.content).decode()

    payload = {
        "image_base64": img_b64,
        "user_id": created_ids["user"] or "demo-user",
        "location": {"city": "Milano", "lat": 45.46, "lng": 9.19},
        "home_situation": {"pets": ["cat"], "lighting": "bright", "space": "small"},
    }
    r = requests.post(f"{BASE_URL}/api/identify", json=payload, timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "common_name" in data and data["common_name"]
    assert "description" in data
    assert "care_guide" in data
    cg = data["care_guide"]
    for k in ("water", "light", "fertilizer", "temperature", "tips"):
        assert k in cg
    assert "confidence" in data
    assert "suitable_for_user" in data and "score" in data["suitable_for_user"]


# ---------- Cleanup ----------
def test_delete_plant(api):
    if not created_ids["plant"] or not created_ids["user"]:
        pytest.skip("no plant created")
    r = api.delete(
        f"{BASE_URL}/api/plants/{created_ids['plant']}?user_id={created_ids['user']}",
        timeout=15,
    )
    assert r.status_code == 200


def test_delete_plant_404(api):
    r = api.delete(
        f"{BASE_URL}/api/plants/does-not-exist?user_id={created_ids['user'] or 'demo'}",
        timeout=15,
    )
    assert r.status_code == 404
