import httpx

BASE_URL = "http://127.0.0.1:8001"

def test_task_crud_lifecycle():
    print("=" * 70)
    print("TASK CRUD & DISPLAY COMPREHENSIVE VERIFICATION TEST")
    print("=" * 70)

    # 1. Login to get valid JWT token
    print("\n[STEP 1] Authenticating test user (Keerthzz)...")
    res = httpx.post(
        f"{BASE_URL}/auth/login",
        data={"username": "Keerthzz", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Authenticated successfully.")

    # 2. Fetch existing tasks
    print("\n[STEP 2] Fetching initial task list (GET /tasks/)...")
    res = httpx.get(f"{BASE_URL}/tasks/", headers=headers)
    assert res.status_code == 200, f"GET /tasks/ failed: {res.text}"
    initial_tasks = res.json()
    assert isinstance(initial_tasks, list), "Expected list of tasks"
    print(f"[PASS] Retrieved {len(initial_tasks)} existing tasks.")

    # 3. Create a new task (POST /tasks/)
    print("\n[STEP 3] Creating a new task (POST /tasks/)...")
    task_payload = {
        "title": "Architect Task Manager 2.0",
        "description": "Implement robust ID mapping and data normalization",
        "status": "Pending",
        "priority": "High",
        "due_date": "2026-10-15"
    }
    res = httpx.post(f"{BASE_URL}/tasks/", json=task_payload, headers=headers)
    assert res.status_code == 200, f"POST /tasks/ failed: {res.text}"
    created_res = res.json()
    assert "task" in created_res, "Expected 'task' key in creation response"
    created_task = created_res["task"]
    task_id = created_task.get("id")
    assert task_id is not None and isinstance(task_id, int), f"Invalid task ID returned: {task_id}"
    assert created_task["title"] == "Architect Task Manager 2.0"
    assert created_task["description"] == "Implement robust ID mapping and data normalization"
    assert created_task["priority"] == "High"
    assert created_task["status"] == "Pending"
    print(f"[PASS] Task created successfully with actual task_id={task_id}.")

    # 4. Edit title (PUT /tasks/{task_id})
    print(f"\n[STEP 4] Updating task title (PUT /tasks/{task_id})...")
    update_title_payload = {
        "title": "Architect Task Manager 2.0 (Updated Title)",
        "description": created_task["description"],
        "status": "Pending",
        "priority": "High",
        "due_date": "2026-10-15"
    }
    res = httpx.put(f"{BASE_URL}/tasks/{task_id}", json=update_title_payload, headers=headers)
    assert res.status_code == 200, f"PUT /tasks/{task_id} failed: {res.text}"
    updated_title_res = res.json()
    assert updated_title_res["task"]["title"] == "Architect Task Manager 2.0 (Updated Title)"
    print(f"[PASS] Title updated successfully: '{updated_title_res['task']['title']}'")

    # 5. Edit description (PUT /tasks/{task_id})
    print(f"\n[STEP 5] Updating task description (PUT /tasks/{task_id})...")
    update_desc_payload = {
        "title": "Architect Task Manager 2.0 (Updated Title)",
        "description": "Enhanced description with zero undefined ID errors.",
        "status": "Pending",
        "priority": "High",
        "due_date": "2026-10-15"
    }
    res = httpx.put(f"{BASE_URL}/tasks/{task_id}", json=update_desc_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["task"]["description"] == "Enhanced description with zero undefined ID errors."
    print("[PASS] Description updated successfully.")

    # 6. Change priority (PUT /tasks/{task_id})
    print(f"\n[STEP 6] Updating task priority to 'Medium' (PUT /tasks/{task_id})...")
    update_priority_payload = {
        "title": "Architect Task Manager 2.0 (Updated Title)",
        "description": "Enhanced description with zero undefined ID errors.",
        "status": "Pending",
        "priority": "Medium",
        "due_date": "2026-10-15"
    }
    res = httpx.put(f"{BASE_URL}/tasks/{task_id}", json=update_priority_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["task"]["priority"] == "Medium"
    print("[PASS] Priority updated successfully.")

    # 7. Mark complete (PUT /tasks/{task_id})
    print(f"\n[STEP 7] Marking task complete (PUT /tasks/{task_id})...")
    complete_payload = {
        "title": "Architect Task Manager 2.0 (Updated Title)",
        "description": "Enhanced description with zero undefined ID errors.",
        "status": "Completed",
        "priority": "Medium",
        "due_date": "2026-10-15"
    }
    res = httpx.put(f"{BASE_URL}/tasks/{task_id}", json=complete_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["task"]["status"] == "Completed"
    print("[PASS] Task marked completed.")

    # 8. Reopen task (PUT /tasks/{task_id})
    print(f"\n[STEP 8] Reopening task (PUT /tasks/{task_id})...")
    reopen_payload = {
        "title": "Architect Task Manager 2.0 (Updated Title)",
        "description": "Enhanced description with zero undefined ID errors.",
        "status": "Pending",
        "priority": "Medium",
        "due_date": "2026-10-15"
    }
    res = httpx.put(f"{BASE_URL}/tasks/{task_id}", json=reopen_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["task"]["status"] == "Pending"
    print("[PASS] Task reopened successfully.")

    # 9. Verify persistence by refetching single task (GET /tasks/{task_id})
    print(f"\n[STEP 9] Verifying persistence in MySQL (GET /tasks/{task_id})...")
    res = httpx.get(f"{BASE_URL}/tasks/{task_id}", headers=headers)
    assert res.status_code == 200
    single_task = res.json()
    assert single_task["id"] == task_id
    assert single_task["title"] == "Architect Task Manager 2.0 (Updated Title)"
    assert single_task["status"] == "Pending"
    assert single_task["priority"] == "Medium"
    print("[PASS] Persistence verified via database retrieval.")

    # 10. Delete task (DELETE /tasks/{task_id})
    print(f"\n[STEP 10] Deleting task (DELETE /tasks/{task_id})...")
    res = httpx.delete(f"{BASE_URL}/tasks/{task_id}", headers=headers)
    assert res.status_code == 200
    print("[PASS] Task deleted.")

    # Verify task is gone
    res = httpx.get(f"{BASE_URL}/tasks/{task_id}", headers=headers)
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    print("[PASS] Confirmed task no longer exists in database (HTTP 404).")

    # 11. Negative test: Confirm /tasks/undefined returns 422 on backend
    print("\n[STEP 11] Confirming /tasks/undefined is guarded...")
    res = httpx.put(f"{BASE_URL}/tasks/undefined", json=reopen_payload, headers=headers)
    assert res.status_code == 422, f"Expected 422 for string 'undefined', got {res.status_code}"
    print("[PASS] Backend correctly requires integer task_id (FastAPI validation). Frontend now strictly prevents undefined IDs.")

    print("\n" + "=" * 70)
    print("ALL TASK CRUD LIFECYCLE TESTS PASSED (100% SUCCESS)")
    print("=" * 70)

if __name__ == "__main__":
    test_task_crud_lifecycle()
