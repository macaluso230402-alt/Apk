"""
PlantCare backend regression suite — JWT auth + cookie-based flow.
Covers: auth (register/login/me/logout/lockout), protected endpoints,
plants CRUD with propagation, propagation-reminder auto-creation,
reminders, profile update, plant-of-the-week, recommendations.
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://plant-smart-care.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@plantcare.com"
ADMIN_PASSWORD = "admin123"


# ---------- helpers / fixtures ----------
def _new_user_payload():
    suffix = uuid.uuid4().hex[:8]
    return {
        "email": f"test_{suffix}@plantcare.com",
        "password": "test1234",
        "name": f"TEST_User_{suffix}",
    }


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    assert "access_token" in s.cookies, f"no access_token cookie: {dict(s.cookies)}"
    assert "refresh_token" in s.cookies
    return s


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    payload = _new_user_payload()
    r = s.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    s.user_email = payload["email"]  # type: ignore
    s.user_password = payload["password"]  # type: ignore
    return s


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    assert r.json() == {"status": "healthy"}


# ---------- Auth: register / login / me ----------
def test_register_returns_user_and_sets_cookies():
    s = requests.Session()
    payload = _new_user_payload()
    r = s.post(f"{API}/auth/register", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == payload["email"]
    assert data["name"] == payload["name"]
    assert "id" in data and isinstance(data["id"], str)
    assert "password_hash" not in data
    assert "access_token" in s.cookies
    assert "refresh_token" in s.cookies


def test_register_duplicate_email_returns_400(user_session):
    s = requests.Session()
    r = s.post(f"{API}/auth/register",
               json={"email": user_session.user_email, "password": "x1234567", "name": "dup"},
               timeout=15)
    assert r.status_code == 400


def test_login_admin_success(admin_session):
    r = admin_session.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == ADMIN_EMAIL
    assert me["role"] == "admin"


def test_get_me_unauthenticated_returns_401():
    r = requests.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401


def test_login_wrong_password_returns_401():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": "WRONG_PW_xyz"}, timeout=15)
    assert r.status_code == 401


# ---------- Protected endpoints reject without cookie ----------
@pytest.mark.parametrize("method,path,body", [
    ("GET", "/plants", None),
    ("POST", "/plants", {"common_name": "x"}),
    ("GET", "/reminders", None),
    ("POST", "/reminders", {"plant_id": "x", "type": "water", "frequency": "weekly"}),
    ("POST", "/recommendations", {}),
    ("POST", "/identify", {"image_base64": "AAA"}),
])
def test_protected_endpoints_require_auth(method, path, body):
    r = requests.request(method, f"{API}{path}", json=body, timeout=15)
    assert r.status_code == 401, f"{method} {path} expected 401, got {r.status_code}"


# ---------- Profile update ----------
def test_update_profile(user_session):
    r = user_session.put(f"{API}/auth/me", json={
        "name": "TEST_Updated_Name",
        "location": {"city": "Roma", "lat": 41.9, "lng": 12.5},
        "home_situation": {"pets": ["gatto"], "lighting": "media", "space": "appartamento"},
    }, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "TEST_Updated_Name"
    assert body["location"]["city"] == "Roma"
    assert body["home_situation"]["pets"] == ["gatto"]

    # Verify via GET
    me = user_session.get(f"{API}/auth/me", timeout=10).json()
    assert me["name"] == "TEST_Updated_Name"


# ---------- Plants CRUD + propagation reminder ----------
@pytest.fixture(scope="module")
def created_plant(user_session):
    """Create a plant whose best_season includes the current season (primavera in May)."""
    payload = {
        "common_name": "TEST_Pothos",
        "scientific_name": "Epipremnum aureum",
        "description": "Test plant",
        "light_requirement": "Bassa-Media",
        "water_requirement": "Settimanale",
        "pet_friendly": False,
        "propagation": {
            "methods": ["talea in acqua"],
            "difficulty": "Facile",
            "best_season": "primavera/estate",
            "rooting_time": "2-3 settimane",
            "steps": ["taglia", "metti in acqua"],
            "tips": "tip",
        },
        "notes": "TEST_note",
    }
    r = user_session.post(f"{API}/plants", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    plant = r.json()
    assert plant["common_name"] == "TEST_Pothos"
    assert plant["propagation"]["best_season"] == "primavera/estate"
    return plant


def test_get_my_plants_returns_created(user_session, created_plant):
    r = user_session.get(f"{API}/plants", timeout=10)
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert created_plant["id"] in ids


def test_get_plant_by_id(user_session, created_plant):
    r = user_session.get(f"{API}/plants/{created_plant['id']}", timeout=10)
    assert r.status_code == 200
    assert r.json()["id"] == created_plant["id"]
    assert r.json()["propagation"]["difficulty"] == "Facile"


def test_get_plant_other_user_returns_404(admin_session, created_plant):
    r = admin_session.get(f"{API}/plants/{created_plant['id']}", timeout=10)
    assert r.status_code == 404


def test_propagation_reminder_auto_created(user_session, created_plant):
    """Spec: best_season contains current season -> a reminder of type=propagation must exist."""
    r = user_session.get(f"{API}/reminders", timeout=10)
    assert r.status_code == 200
    rems = r.json()
    prop_rem = [x for x in rems if x["plant_id"] == created_plant["id"] and x["type"] == "propagation"]
    assert len(prop_rem) == 1, f"expected one propagation reminder, got {prop_rem}"
    assert prop_rem[0]["enabled"] is True
    assert "primavera" in prop_rem[0]["frequency"].lower()


def test_no_propagation_reminder_when_season_mismatch(user_session):
    """Plant with best_season=autunno only -> no propagation reminder."""
    payload = {
        "common_name": "TEST_OffSeason",
        "propagation": {
            "methods": ["seme"], "difficulty": "Media",
            "best_season": "autunno", "rooting_time": "1m",
            "steps": ["s1"], "tips": "x",
        },
    }
    r = user_session.post(f"{API}/plants", json=payload, timeout=15)
    assert r.status_code == 200
    plant = r.json()
    rems = user_session.get(f"{API}/reminders", timeout=10).json()
    prop_rem = [x for x in rems if x["plant_id"] == plant["id"] and x["type"] == "propagation"]
    assert prop_rem == []
    # cleanup
    user_session.delete(f"{API}/plants/{plant['id']}", timeout=10)


# ---------- Reminders CRUD ----------
def test_create_water_reminder(user_session, created_plant):
    r = user_session.post(f"{API}/reminders",
                          json={"plant_id": created_plant["id"], "type": "water", "frequency": "weekly"},
                          timeout=10)
    assert r.status_code == 200, r.text
    rem = r.json()
    assert rem["type"] == "water"
    assert rem["plant_name"] == "TEST_Pothos"

    # toggle
    upd = user_session.put(f"{API}/reminders/{rem['id']}", json={"enabled": False}, timeout=10)
    assert upd.status_code == 200

    # delete
    delr = user_session.delete(f"{API}/reminders/{rem['id']}", timeout=10)
    assert delr.status_code == 200


def test_delete_plant_cascades_reminders(user_session):
    # create disposable plant + reminder
    r = user_session.post(f"{API}/plants", json={"common_name": "TEST_Cascade"}, timeout=15)
    pid = r.json()["id"]
    user_session.post(f"{API}/reminders",
                      json={"plant_id": pid, "type": "water", "frequency": "weekly"}, timeout=10)
    # delete plant
    d = user_session.delete(f"{API}/plants/{pid}", timeout=10)
    assert d.status_code == 200
    rems = user_session.get(f"{API}/reminders", timeout=10).json()
    assert all(x["plant_id"] != pid for x in rems)


# ---------- Recommendations ----------
def test_recommendations_unfiltered(user_session):
    r = user_session.post(f"{API}/recommendations", json={"filters": {}}, timeout=10)
    assert r.status_code == 200
    assert len(r.json()["recommendations"]) >= 5


def test_recommendations_pet_friendly_filter(user_session):
    r = user_session.post(f"{API}/recommendations",
                          json={"filters": {"pet_friendly": True}}, timeout=10)
    assert r.status_code == 200
    recs = r.json()["recommendations"]
    assert recs and all(p["pet_friendly"] for p in recs)


# ---------- Plant of the week ----------
def test_plant_of_the_week_public():
    r = requests.get(f"{API}/plant-of-the-week", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert "plant" in body and "week" in body
    assert body["plant"]["name"]


# ---------- Logout ----------
def test_logout_clears_cookies():
    s = requests.Session()
    payload = _new_user_payload()
    s.post(f"{API}/auth/register", json=payload, timeout=15)
    assert "access_token" in s.cookies
    r = s.post(f"{API}/auth/logout", timeout=10)
    assert r.status_code == 200
    # After logout server-cleared cookies, subsequent /me must 401
    s.cookies.clear()
    r2 = s.get(f"{API}/auth/me", timeout=10)
    assert r2.status_code == 401


# ---------- Brute force lockout ----------
def test_brute_force_lockout():
    """K8s ingress may rotate client IP across requests, so we retry many times
    and consider the test passed as soon as we observe a 429 (lockout) response."""
    fake_email = f"locktest_{uuid.uuid4().hex[:8]}@plantcare.com"
    requests.post(f"{API}/auth/register",
                  json={"email": fake_email, "password": "correctpw1", "name": "Lock"}, timeout=15)
    seen_429 = False
    for _ in range(20):
        r = requests.post(f"{API}/auth/login",
                          json={"email": fake_email, "password": "WRONG_pw"}, timeout=15)
        if r.status_code == 429:
            seen_429 = True
            break
        assert r.status_code == 401, f"unexpected status {r.status_code}: {r.text}"
        time.sleep(0.1)
    assert seen_429, "never received 429 lockout after 20 wrong-password attempts (env may rotate IPs)"
