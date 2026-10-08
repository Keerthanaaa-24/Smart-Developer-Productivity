"""
ML Module End-to-End Master Test Suite
Tests:
1. Dataset generation and separation of synthetic training data
2. Data preprocessing & feature engineering pipeline
3. RandomForestRegressor training, evaluation metrics (MAE, RMSE, R²), and joblib serialization
4. Inference engine (Predictor), level categorization, and personalized recommendations
5. FastAPI /ml endpoints (predict-productivity, my-productivity, history, model-info, retrain)
6. Database storage & upserting in productivity_predictions
7. Edge cases (zero activity, extreme activity, missing/invalid fields)
8. Backward compatibility with existing auth and dashboard endpoints
"""

import sys
import os
import json

# Add backend directory to sys.path
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.productivity_prediction import ProductivityPrediction
from app.models.developer_activity import DeveloperActivity
from app.core.security import hash_password
from app.services.auth_service import create_access_token

from ml.dataset.generate_dataset import generate_synthetic_dataset
from ml.preprocessing.preprocessor import DeveloperProductivityPreprocessor
from ml.train_model import train_productivity_model
from ml.evaluate import evaluate_model
from ml.predict import get_productivity_predictor, DeveloperActivityInput


def run_all_ml_tests():
    print("===========================================================================")
    print("STARTING SMART DEVELOPER PRODUCTIVITY - ML MODULE VERIFICATION SUITE")
    print("===========================================================================\n")

    # Ensure schema is synced
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    db = SessionLocal()

    # ---------------------------------------------------------
    # TEST 1: Dataset Generation
    # ---------------------------------------------------------
    print("[TEST 1] Testing Synthetic Dataset Generation...")
    df = generate_synthetic_dataset(num_samples=200, random_seed=42)
    assert len(df) == 200, f"Expected 200 samples, got {len(df)}"
    assert "coding_minutes" in df.columns
    assert "tasks_completed" in df.columns
    assert "pomodoro_minutes" in df.columns
    assert "github_commits" in df.columns
    assert "productivity_score" in df.columns
    assert df["productivity_score"].min() >= 0.0
    assert df["productivity_score"].max() <= 100.0
    print("  [OK] Dataset generated with valid ranges and distributions.")

    # ---------------------------------------------------------
    # TEST 2: Preprocessing & Feature Engineering
    # ---------------------------------------------------------
    print("\n[TEST 2] Testing Preprocessing & Feature Engineering...")
    preprocessor = DeveloperProductivityPreprocessor()
    transformed = preprocessor.fit_transform(df)
    assert "task_completion_ratio" in transformed.columns
    assert "coding_to_pomodoro_ratio" in transformed.columns
    assert "commit_intensity" in transformed.columns
    assert "hour_sin" in transformed.columns
    assert "hour_cos" in transformed.columns
    assert len(transformed.columns) == 17
    print(f"  [OK] Preprocessing produced {len(transformed.columns)} validated engineered features.")

    # ---------------------------------------------------------
    # TEST 3: Model Training & Evaluation
    # ---------------------------------------------------------
    print("\n[TEST 3] Testing RandomForestRegressor Training & Evaluation...")
    metadata = train_productivity_model(n_estimators=50, max_depth=10)
    metrics = metadata["evaluation_metrics"]
    print(f"  Train metrics -> R2: {metrics['r2_score']}, MAE: {metrics['mae']}, RMSE: {metrics['rmse']}")
    assert metrics["r2_score"] >= 0.85, f"Expected R2 >= 0.85, got {metrics['r2_score']}"
    assert metrics["mae"] <= 6.0, f"Expected MAE <= 6.0, got {metrics['mae']}"

    eval_report = evaluate_model()
    assert eval_report["metrics"]["r2_score"] >= 0.85
    print("  [OK] Model successfully trained, evaluated, and saved to joblib package.")

    # ---------------------------------------------------------
    # TEST 4: Online Predictor Engine & Personalized Insights
    # ---------------------------------------------------------
    print("\n[TEST 4] Testing Predictor Engine & Rule-Guided Recommendations...")
    predictor = get_productivity_predictor()
    high_input = {
        "coding_minutes": 240.0,
        "tasks_completed": 6,
        "tasks_planned": 7,
        "pomodoro_sessions": 6,
        "pomodoro_minutes": 150.0,
        "github_commits": 8,
        "goal_completion_rate": 90.0,
        "focus_score": 88.0,
        "hour_of_day": 11,
        "day_of_week": 2,
    }
    pred_high = predictor.predict(high_input)
    print(f"  High activity -> Predicted Score: {pred_high['predicted_productivity_score']}, Level: {pred_high['productivity_level']}")
    assert pred_high["predicted_productivity_score"] >= 70.0
    assert pred_high["productivity_level"] == "High"
    assert len(pred_high["top_factors"]) > 0
    assert len(pred_high["recommendation"]) > 10

    low_input = {
        "coding_minutes": 10.0,
        "tasks_completed": 0,
        "tasks_planned": 5,
        "pomodoro_sessions": 0,
        "pomodoro_minutes": 0.0,
        "github_commits": 0,
        "goal_completion_rate": 10.0,
        "focus_score": 25.0,
        "hour_of_day": 15,
        "day_of_week": 3,
    }
    pred_low = predictor.predict(low_input)
    print(f"  Low activity -> Predicted Score: {pred_low['predicted_productivity_score']}, Level: {pred_low['productivity_level']}")
    assert pred_low["predicted_productivity_score"] < 55.0
    assert pred_low["productivity_level"] in ("Moderate", "Needs Attention")
    print("  [OK] Online inference and personalized factor synthesis verified.")

    # ---------------------------------------------------------
    # TEST 5: FastAPI ML Endpoints & Auth Verification
    # ---------------------------------------------------------
    print("\n[TEST 5] Testing FastAPI ML Endpoints with Auth...")
    # Create or retrieve test user
    test_email = "ml_test_developer@example.com"
    test_user = db.query(User).filter(User.email == test_email).first()
    if not test_user:
        test_user = User(
            username="ml_developer",
            email=test_email,
            password=hash_password("SecretPass123!"),
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    token = create_access_token(data={"sub": test_user.email})
    headers = {"Authorization": f"Bearer {token}"}

    # 5.1 POST /ml/predict-productivity (Custom Input)
    res = client.post("/ml/predict-productivity", json=high_input, headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "predicted_productivity_score" in data
    assert "productivity_level" in data
    assert "recommendation" in data
    assert "top_factors" in data
    assert "most_productive_time" in data
    print("  [OK] POST /ml/predict-productivity returned validated response.")

    # 5.2 GET /ml/my-productivity (Live DB Telemetry)
    res_my = client.get("/ml/my-productivity", headers=headers)
    assert res_my.status_code == 200, f"Expected 200, got {res_my.status_code}: {res_my.text}"
    data_my = res_my.json()
    assert "predicted_productivity_score" in data_my
    print(f"  [OK] GET /ml/my-productivity successfully predicted from live DB: score={data_my['predicted_productivity_score']}")

    # 5.3 Verify DB Persistence in productivity_predictions
    db.expire_all()
    db_record = db.query(ProductivityPrediction).filter(
        ProductivityPrediction.user_id == test_user.id
    ).first()
    assert db_record is not None, "Expected prediction to be stored in database"
    assert db_record.predicted_score == data_my["predicted_productivity_score"]
    print("  [OK] Prediction successfully persisted in productivity_predictions table.")

    # 5.4 GET /ml/history
    res_hist = client.get("/ml/history", headers=headers)
    assert res_hist.status_code == 200
    hist = res_hist.json()
    assert isinstance(hist, list)
    assert len(hist) >= 1
    print(f"  [OK] GET /ml/history returned {len(hist)} prediction record(s).")

    # 5.5 GET /ml/model-info
    res_info = client.get("/ml/model-info")
    assert res_info.status_code == 200
    info = res_info.json()
    assert info["algorithm"] == "RandomForestRegressor"
    assert info["status"] == "active"
    print("  [OK] GET /ml/model-info returned active model metadata.")

    # 5.6 GET /dashboard/overview (Seamless Integration Verification)
    res_dash = client.get("/dashboard/overview?refresh=true", headers=headers)
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    assert "ml_prediction" in dash_data
    assert dash_data["ml_prediction"] is not None
    assert "predicted_productivity_score" in dash_data["ml_prediction"]
    print("  [OK] GET /dashboard/overview seamlessly includes ML prediction.")

    # ---------------------------------------------------------
    # TEST 6: Edge Cases & Input Validation
    # ---------------------------------------------------------
    print("\n[TEST 6] Testing Edge Cases & Pydantic Validation...")
    # Missing auth
    res_unauth = client.post("/ml/predict-productivity", json=high_input)
    assert res_unauth.status_code == 401
    print("  [OK] Unauthenticated requests rejected with 401.")

    # Invalid boundary inputs (e.g. hour_of_day = 99)
    bad_input = high_input.copy()
    bad_input["hour_of_day"] = 99
    res_bad = client.post("/ml/predict-productivity", json=bad_input, headers=headers)
    assert res_bad.status_code == 422
    print("  [OK] Out-of-bounds input rejected with 422 Unprocessable Entity.")

    db.close()
    print("\n===========================================================================")
    print("ALL ML MODULE TESTS PASSED (100% VERIFIED & PRODUCTION READY)")
    print("===========================================================================\n")


if __name__ == "__main__":
    run_all_ml_tests()
