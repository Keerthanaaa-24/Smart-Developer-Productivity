"""
Model Training Script for Developer Productivity ML Module
Trains a RandomForestRegressor on preprocessed developer activity telemetry.
Evaluates regression metrics (MAE, MSE, RMSE, R²) and persists the model artifact.
"""

import os
import sys
import json
import time
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Ensure backend directory is in sys.path for direct script execution
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from ml.dataset.generate_dataset import generate_synthetic_dataset, save_dataset
from ml.preprocessing.preprocessor import (
    prepare_train_test_data,
    RAW_FEATURE_COLUMNS,
    FINAL_FEATURE_COLUMNS,
)


def train_productivity_model(
    dataset_path: str = None,
    model_output_dir: str = None,
    n_estimators: int = 100,
    max_depth: int = 12,
    random_state: int = 42,
) -> dict:
    """
    Executes the complete ML training pipeline.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    if dataset_path is None:
        dataset_path = os.path.join(base_dir, "dataset", "synthetic_developer_productivity.csv")
    
    if model_output_dir is None:
        model_output_dir = os.path.join(base_dir, "models")

    os.makedirs(model_output_dir, exist_ok=True)

    # 1. Load or Generate Dataset
    if not os.path.exists(dataset_path):
        print(f"[ML TRAIN] Dataset not found at {dataset_path}. Generating synthetic baseline dataset...")
        df = generate_synthetic_dataset(num_samples=5000, random_seed=random_state)
        save_dataset(df, dataset_path)
    else:
        print(f"[ML TRAIN] Loading training dataset from: {dataset_path}")
        df = pd.read_csv(dataset_path)

    print(f"[ML TRAIN] Total samples: {len(df)}")

    # 2. Preprocess & Train/Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test, preprocessor = prepare_train_test_data(
        df, test_size=0.2, random_state=random_state, apply_scaling=False
    )
    print(f"[ML TRAIN] Training samples: {len(X_train)} | Testing samples: {len(X_test)}")
    print(f"[ML TRAIN] Engineered feature count: {len(FINAL_FEATURE_COLUMNS)}")

    # 3. Model Definition: RandomForestRegressor
    # Chosen for strong non-linear feature interaction modeling, robustness to outliers, and high interpretability
    rf_model = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=random_state,
        n_jobs=-1,
    )

    # 4. Fit Model
    print("[ML TRAIN] Training RandomForestRegressor...")
    start_time = time.time()
    rf_model.fit(X_train, y_train)
    training_duration = round(time.time() - start_time, 3)
    print(f"[ML TRAIN] Model training completed in {training_duration}s")

    # 5. Evaluate on Test Set
    y_pred = rf_model.predict(X_test)
    y_pred = np.clip(y_pred, 0.0, 100.0)

    mae = float(mean_absolute_error(y_test, y_pred))
    mse = float(mean_squared_error(y_test, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_test, y_pred))

    # Feature Importances
    importances = rf_model.feature_importances_
    feat_imp = [
        {"feature": name, "importance": round(float(imp), 4)}
        for name, imp in sorted(zip(FINAL_FEATURE_COLUMNS, importances), key=lambda x: x[1], reverse=True)
    ]

    print("\n================ ML MODEL EVALUATION METRICS ================")
    print(f"  • R² Score (Coefficient of Determination) : {r2:.4f}")
    print(f"  • MAE (Mean Absolute Error)               : {mae:.4f} pts")
    print(f"  • RMSE (Root Mean Squared Error)          : {rmse:.4f} pts")
    print(f"  • MSE (Mean Squared Error)                : {mse:.4f}")
    print("=============================================================\n")

    print("Top 5 Predictive Features:")
    for i, item in enumerate(feat_imp[:5], 1):
        print(f"  {i}. {item['feature']}: {item['importance'] * 100:.2f}%")

    # 6. Save Model Artifact & Preprocessor
    model_artifact_path = os.path.join(model_output_dir, "productivity_random_forest.joblib")
    package = {
        "model": rf_model,
        "preprocessor": preprocessor,
        "raw_features": RAW_FEATURE_COLUMNS,
        "final_features": FINAL_FEATURE_COLUMNS,
        "model_version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "metrics": {
            "r2_score": round(r2, 4),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "mse": round(mse, 4),
        }
    }
    joblib.dump(package, model_artifact_path)
    print(f"[ML TRAIN] Saved trained model package to: {model_artifact_path}")

    # 7. Save Model Metadata & Evaluation Report
    metadata = {
        "model_name": "Developer Productivity RandomForestRegressor",
        "algorithm": "RandomForestRegressor",
        "version": "1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "hyperparameters": {
            "n_estimators": n_estimators,
            "max_depth": max_depth,
            "min_samples_split": 4,
            "min_samples_leaf": 2,
            "random_state": random_state,
        },
        "dataset_info": {
            "total_samples": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "is_synthetic_baseline": True,
        },
        "evaluation_metrics": {
            "r2_score": round(r2, 4),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "mse": round(mse, 4),
        },
        "feature_importances": feat_imp,
    }

    metadata_path = os.path.join(model_output_dir, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    report_path = os.path.join(base_dir, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(metadata, f, indent=2)

    return metadata


if __name__ == "__main__":
    train_productivity_model()
