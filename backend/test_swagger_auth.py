import httpx
import sys

BASE_URL = "http://127.0.0.1:8001"

def test_swagger_and_react_auth():
    print("=" * 70)
    print("COMPREHENSIVE SWAGGER UI & REACT AUTHENTICATION TEST SUITE")
    print("=" * 70)

    # 1. Test React Login format (x-www-form-urlencoded with email in username field)
    print("\n[TEST 1] React Login Flow (x-www-form-urlencoded with Email)...")
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={"username": "keerthzz@gmail.com", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200, f"React login failed: {res.text}"
    data = res.json()
    assert "access_token" in data, "No access_token in response"
    assert data["token_type"] == "bearer", "token_type is not bearer"
    token_react = data["access_token"]
    print(f"[PASS] React login succeeded. Token received: {token_react[:25]}...")

    # 2. Test Swagger UI Authorize flow using Username (x-www-form-urlencoded)
    print("\n[TEST 2] Swagger UI Authorize Flow (using Username: 'Keerthzz')...")
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={
            "grant_type": "password",
            "username": "Keerthzz",
            "password": "password123",
            "scope": ""
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200, f"Swagger Authorize with username failed: {res.text}"
    data = res.json()
    assert "access_token" in data
    token_swagger_username = data["access_token"]
    print(f"[PASS] Swagger Authorize with username succeeded. Token: {token_swagger_username[:25]}...")

    # 3. Test Swagger UI Authorize flow using Email (x-www-form-urlencoded)
    print("\n[TEST 3] Swagger UI Authorize Flow (using Email: 'keerthzz@gmail.com')...")
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={
            "grant_type": "password",
            "username": "keerthzz@gmail.com",
            "password": "password123",
            "scope": ""
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200, f"Swagger Authorize with email failed: {res.text}"
    data = res.json()
    token_swagger_email = data["access_token"]
    print(f"[PASS] Swagger Authorize with email succeeded. Token: {token_swagger_email[:25]}...")

    # 4. Test JSON client login format
    print("\n[TEST 4] JSON Client Login Flow...")
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"username": "Keerthzz", "password": "password123"}
    )
    assert res.status_code == 200, f"JSON login failed: {res.text}"
    token_json = res.json()["access_token"]
    print(f"[PASS] JSON login succeeded. Token: {token_json[:25]}...")

    # 5. Test protected endpoint using Swagger Bearer Token
    print("\n[TEST 5] Protected Endpoint Access with Swagger Bearer Token...")
    res = httpx.get(
        f"{BASE_URL}/dashboard/overview",
        headers={"Authorization": f"Bearer {token_swagger_username}"}
    )
    assert res.status_code == 200, f"Protected endpoint failed with valid token: {res.text}"
    dash_data = res.json()
    assert "today_summary" in dash_data and "user" in dash_data
    print(f"[PASS] Protected endpoint (/dashboard/overview) accessed successfully via Swagger Bearer token for user '{dash_data['user']['username']}'.")

    # 6. Test protected endpoint without token (Must return 401)
    print("\n[TEST 6] Protected Endpoint without Token (Expect 401 Unauthorized)...")
    res = httpx.get(f"{BASE_URL}/dashboard/overview")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("[PASS] Protected endpoint correctly rejected request without token with HTTP 401.")

    # 7. Test protected endpoint with invalid token (Must return 401)
    print("\n[TEST 7] Protected Endpoint with Invalid Token (Expect 401 Unauthorized)...")
    res = httpx.get(
        f"{BASE_URL}/dashboard/overview",
        headers={"Authorization": "Bearer invalid.token.value"}
    )
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("[PASS] Protected endpoint correctly rejected invalid token with HTTP 401.")

    # 8. Test invalid password (Must return 401)
    print("\n[TEST 8] Login with Incorrect Password (Expect 401 Unauthorized)...")
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={"username": "Keerthzz", "password": "WrongPassword999"}
    )
    assert res.status_code == 401, f"Expected 401 for bad password, got {res.status_code}"
    print("[PASS] Login with incorrect password correctly returned HTTP 401.")

    # 9. Verify OpenAPI schema contains securitySchemes and OAuth2PasswordBearer
    print("\n[TEST 9] OpenAPI Schema /docs Verification...")
    res = httpx.get(f"{BASE_URL}/openapi.json")
    assert res.status_code == 200, "Failed to load openapi.json"
    openapi_doc = res.json()
    assert "components" in openapi_doc
    assert "securitySchemes" in openapi_doc["components"]
    assert "OAuth2PasswordBearer" in openapi_doc["components"]["securitySchemes"]
    token_url = openapi_doc["components"]["securitySchemes"]["OAuth2PasswordBearer"]["flows"]["password"]["tokenUrl"]
    assert token_url == "/auth/login" or token_url == "auth/login", f"Unexpected tokenUrl: {token_url}"
    print(f"[PASS] OpenAPI docs correctly expose OAuth2 security scheme with tokenUrl='{token_url}'.")

    # 10. Test protected Task endpoints with Swagger Token
    print("\n[TEST 10] Tasks Endpoint Verification with Swagger Token...")
    res = httpx.get(
        f"{BASE_URL}/tasks/",
        headers={"Authorization": f"Bearer {token_swagger_username}"}
    )
    assert res.status_code == 200, f"Tasks endpoint failed: {res.text}"
    print("[PASS] Tasks endpoint successfully accessed with Swagger token.")

    print("\n" + "=" * 70)
    print("ALL 10 SWAGGER & REACT AUTHENTICATION TESTS PASSED (100% SUCCESS)")
    print("=" * 70)

if __name__ == "__main__":
    test_swagger_and_react_auth()
