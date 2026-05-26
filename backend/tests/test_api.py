"""PlantCare backend regression — single-user, no-auth API.

Covers: health, profile auto-seed + update, plants CRUD + idempotency +
cascade delete, reminders CRUD, plant-of-the-week, recommendations filters,
auth endpoints are GONE (must 404), /api/identify smoke (Gemini network).
"""
import os
import uuid
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except FileNotFoundError:
        pass

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ============ HEALTH ============
class TestHealth:
    def test_health(self, s):
        r = s.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        assert r.json().get("status") == "healthy"


# ============ NO AUTH ENDPOINTS ============
class TestNoAuth:
    @pytest.mark.parametrize("path", [
        "/auth/login", "/auth/register", "/auth/logout",
        "/auth/me", "/auth/reset-password",
    ])
    def test_auth_endpoints_gone(self, s, path):
        # Try GET and POST — both should be 404/405 (route doesn't exist)
        for method in ("get", "post"):
            r = getattr(s, method)(f"{API}{path}", json={}, timeout=10)
            assert r.status_code in (404, 405), (
                f"{method.upper()} {path} -> {r.status_code} (expected 404/405). Auth must be removed."
            )


# ============ PROFILE ============
class TestProfile:
    def test_get_profile_auto_seeded(self, s):
        r = s.get(f"{API}/profile", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == "default-user"
        assert isinstance(data["name"], str) and data["name"]

    def test_update_profile_persists(self, s):
        payload = {
            "name": "Mario",
            "location": {"city": "Roma"},
            "home_situation": {"pets": ["Cani"], "lighting": "Media", "space": "Appartamento"},
        }
        r = s.put(f"{API}/profile", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == "Mario"
        assert body["location"]["city"] == "Roma"
        assert "Cani" in body["home_situation"]["pets"]

        # Verify persistence
        r2 = s.get(f"{API}/profile", timeout=15)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["name"] == "Mario"
        assert d2["location"]["city"] == "Roma"
        assert d2["home_situation"]["lighting"] == "Media"


# ============ PLANTS ============
@pytest.fixture(scope="class")
def created_plant_id(request, s):
    payload = {
        "common_name": "TEST_Pothos",
        "scientific_name": "Epipremnum aureum",
        "description": "Test plant",
        "light_requirement": "Bassa-Media",
        "water_requirement": "Settimanale",
        "pet_friendly": False,
    }
    r = s.post(f"{API}/plants", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    request.cls.plant_id = pid
    yield pid
    # Cleanup at end of class
    s.delete(f"{API}/plants/{pid}", timeout=15)


class TestPlants:
    def test_create_plant(self, s, created_plant_id):
        r = s.get(f"{API}/plants/{created_plant_id}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["common_name"] == "TEST_Pothos"
        assert body["user_id"] == "default-user"
        assert body["id"] == created_plant_id
        assert "_id" not in body
        assert "client_id" not in body

    def test_list_plants_contains_created(self, s, created_plant_id):
        r = s.get(f"{API}/plants", timeout=15)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert created_plant_id in ids

    def test_idempotent_create_with_client_id(self, s):
        cid = f"TEST_cid_{uuid.uuid4()}"
        payload = {"common_name": "TEST_IdempotentPlant", "client_id": cid}
        r1 = s.post(f"{API}/plants", json=payload, timeout=15)
        assert r1.status_code == 200
        id1 = r1.json()["id"]

        r2 = s.post(f"{API}/plants", json=payload, timeout=15)
        assert r2.status_code == 200
        id2 = r2.json()["id"]
        assert id1 == id2, "Same client_id must return same plant id"
        # Cleanup
        s.delete(f"{API}/plants/{id1}", timeout=15)

    def test_get_nonexistent_plant_404(self, s):
        r = s.get(f"{API}/plants/does-not-exist-{uuid.uuid4()}", timeout=15)
        assert r.status_code == 404

    def test_delete_plant_cascades_reminders(self, s):
        # Create plant
        cp = s.post(f"{API}/plants", json={"common_name": "TEST_CascadePlant"}, timeout=15)
        assert cp.status_code == 200
        pid = cp.json()["id"]

        # Create reminder on it
        cr = s.post(f"{API}/reminders", json={
            "plant_id": pid, "type": "water", "frequency": "Settimanale",
        }, timeout=15)
        assert cr.status_code == 200, cr.text
        rid = cr.json()["id"]

        # Delete plant
        d = s.delete(f"{API}/plants/{pid}", timeout=15)
        assert d.status_code == 200

        # Reminder should be gone
        rems = s.get(f"{API}/reminders", timeout=15).json()
        assert rid not in [r["id"] for r in rems], "Reminder was not cascade-deleted"

    def test_delete_nonexistent_plant_404(self, s):
        r = s.delete(f"{API}/plants/missing-{uuid.uuid4()}", timeout=15)
        assert r.status_code == 404


# ============ JOURNAL ============
class TestJournal:
    @pytest.fixture(scope="class")
    def plant_for_journal(self, s):
        cp = s.post(f"{API}/plants", json={"common_name": "TEST_JournalPlant"}, timeout=15)
        assert cp.status_code == 200
        pid = cp.json()["id"]
        yield pid
        # Cleanup
        s.delete(f"{API}/plants/{pid}", timeout=15)

    def test_create_and_list_journal_sorted_desc(self, s, plant_for_journal):
        tiny_b64 = base64.b64encode(b"\xff\xd8\xff\xe0fakejpegheader").decode()
        # Entry 1
        r1 = s.post(f"{API}/plants/{plant_for_journal}/journal",
                    json={"image_base64": tiny_b64, "note": "prima foto"}, timeout=15)
        assert r1.status_code == 200, r1.text
        e1 = r1.json()
        assert e1["plant_id"] == plant_for_journal
        assert e1["note"] == "prima foto"
        assert e1["image_url"].startswith("data:image/jpeg;base64,")
        assert "_id" not in e1
        assert "client_id" not in e1

        # Entry 2 (slightly later)
        import time
        time.sleep(0.05)
        r2 = s.post(f"{API}/plants/{plant_for_journal}/journal",
                    json={"image_base64": tiny_b64, "note": "seconda foto"}, timeout=15)
        assert r2.status_code == 200
        e2 = r2.json()

        # List sorted newest-first
        lst = s.get(f"{API}/plants/{plant_for_journal}/journal", timeout=15)
        assert lst.status_code == 200
        items = lst.json()
        assert len(items) >= 2
        ids = [x["id"] for x in items]
        assert ids.index(e2["id"]) < ids.index(e1["id"]), "newest should come first"
        # Cleanup entries
        for e in (e1, e2):
            s.delete(f"{API}/plants/{plant_for_journal}/journal/{e['id']}", timeout=15)

    def test_journal_idempotency(self, s, plant_for_journal):
        cid = f"TEST_journal_cid_{uuid.uuid4()}"
        payload = {"client_id": cid, "note": "idempotent", "image_base64": "Zm9v"}
        a = s.post(f"{API}/plants/{plant_for_journal}/journal", json=payload, timeout=15)
        b = s.post(f"{API}/plants/{plant_for_journal}/journal", json=payload, timeout=15)
        assert a.status_code == 200 and b.status_code == 200
        assert a.json()["id"] == b.json()["id"], "same client_id must return same entry"
        s.delete(f"{API}/plants/{plant_for_journal}/journal/{a.json()['id']}", timeout=15)

    def test_journal_on_missing_plant_404(self, s):
        missing = f"missing-{uuid.uuid4()}"
        r = s.get(f"{API}/plants/{missing}/journal", timeout=15)
        assert r.status_code == 404
        assert "Plant not found" in r.text
        r2 = s.post(f"{API}/plants/{missing}/journal", json={"note": "x"}, timeout=15)
        assert r2.status_code == 404

    def test_delete_plant_cascades_journal(self, s):
        cp = s.post(f"{API}/plants", json={"common_name": "TEST_CascadeJournalPlant"}, timeout=15)
        assert cp.status_code == 200
        pid = cp.json()["id"]
        # Add 2 journal entries
        for note in ("a", "b"):
            jr = s.post(f"{API}/plants/{pid}/journal", json={"note": note}, timeout=15)
            assert jr.status_code == 200
        # Verify they exist
        lst = s.get(f"{API}/plants/{pid}/journal", timeout=15)
        assert lst.status_code == 200 and len(lst.json()) == 2
        # Delete plant -> cascade
        d = s.delete(f"{API}/plants/{pid}", timeout=15)
        assert d.status_code == 200
        # Now journal GET should 404 (plant gone)
        after = s.get(f"{API}/plants/{pid}/journal", timeout=15)
        assert after.status_code == 404


# ============ REMINDERS ============
class TestReminders:
    @pytest.fixture(scope="class")
    def plant_for_reminders(self, s):
        cp = s.post(f"{API}/plants", json={"common_name": "TEST_ReminderPlant"}, timeout=15)
        assert cp.status_code == 200
        pid = cp.json()["id"]
        yield pid
        s.delete(f"{API}/plants/{pid}", timeout=15)

    def test_full_reminder_lifecycle(self, s, plant_for_reminders):
        # Create
        cr = s.post(f"{API}/reminders", json={
            "plant_id": plant_for_reminders, "type": "water", "frequency": "Settimanale",
        }, timeout=15)
        assert cr.status_code == 200
        rid = cr.json()["id"]
        assert cr.json()["enabled"] is True

        # List
        lst = s.get(f"{API}/reminders", timeout=15).json()
        assert rid in [r["id"] for r in lst]

        # Toggle off
        u = s.put(f"{API}/reminders/{rid}", json={"enabled": False}, timeout=15)
        assert u.status_code == 200
        after = [r for r in s.get(f"{API}/reminders", timeout=15).json() if r["id"] == rid][0]
        assert after["enabled"] is False

        # Delete
        d = s.delete(f"{API}/reminders/{rid}", timeout=15)
        assert d.status_code == 200
        assert rid not in [r["id"] for r in s.get(f"{API}/reminders", timeout=15).json()]

    def test_create_reminder_unknown_plant_404(self, s):
        r = s.post(f"{API}/reminders", json={
            "plant_id": f"missing-{uuid.uuid4()}", "type": "water", "frequency": "Daily",
        }, timeout=15)
        assert r.status_code == 404


# ============ PLANT OF THE WEEK ============
class TestPlantOfTheWeek:
    def test_potw(self, s):
        r = s.get(f"{API}/plant-of-the-week", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "plant" in body and "week" in body and "next_reset" in body
        assert "name" in body["plant"] and "image" in body["plant"]


# ============ RECOMMENDATIONS ============
class TestRecommendations:
    def test_no_filters(self, s):
        r = s.post(f"{API}/recommendations", json={}, timeout=15)
        assert r.status_code == 200
        recs = r.json()["recommendations"]
        assert len(recs) >= 5

    def test_pet_friendly_filter(self, s):
        r = s.post(f"{API}/recommendations", json={"filters": {"pet_friendly": True}}, timeout=15)
        assert r.status_code == 200
        recs = r.json()["recommendations"]
        assert len(recs) > 0
        assert all(p["pet_friendly"] is True for p in recs)


# ============ IDENTIFY (Gemini network call) ============
class TestIdentify:
    def test_identify_with_tiny_image(self, s):
        # 1x1 transparent PNG
        tiny = base64.b64encode(bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c626001000000050001"
            "0d0a2db40000000049454e44ae426082"
        )).decode()
        r = s.post(f"{API}/identify", json={"image_base64": tiny}, timeout=90)
        # Endpoint exists and responds; with a 1x1 image, Gemini may reject it.
        # Acceptable: 200 with fallback OR 500 with Gemini error. NOT 404/405/422 (route missing/wiring broken).
        assert r.status_code in (200, 500), f"identify wiring failure: {r.status_code} {r.text[:200]}"
        if r.status_code == 200:
            body = r.json()
            assert "common_name" in body
            assert "care_guide" in body
            assert "confidence" in body
        else:
            # Document the leak: server returns raw Gemini error.
            assert "Gemini" in r.text or "identifying" in r.text
