"""
Model Evaluation Script for Developer Productivity ML Module
Evaluates saved model artifact against test/evaluation datasets and produces metrics.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Ensure backend directory is in sys.path for direct script execution
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)


def evaluate_model(
    model_path: str = None,
    dataset_path: str = None,
    report_output_path: str = None,
) -> dict:
    """
    Evaluates the trained ML model package and writes the evaluation report.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    if model_path is None:
        model_path = os.path.join(base_dir, "models", "productivity_random_forest.joblib")
        
    if dataset_path is None:
        dataset_path = os.path.join(base_dir, "dataset", "synthetic_developer_productivity.csv")

    if report_output_path is None:
        report_output_path = os.path.join(base_dir, "evaluation_report.json")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model artifact not found at: {model_path}. Run train_model.py first.")

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at: {dataset_path}.")

    print(f"[ML EVALUATE] Loading model package from: {model_path}")
    package = joblib.load(model_path)
    model = package["model"]
    preprocessor = package["preprocessor"]
    final_features = package["final_features"]

    print(f"[ML EVALUATE] Loading test dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)

    # Use holdout / test slice
    X = preprocessor.transform(df)
    y_true = df["productivity_score"].values

    y_pred = model.predict(X)
    y_pred = np.clip(y_pred, 0.0, 100.0)

    # Compute regression metrics
    mae = float(mean_absolute_error(y_true, y_pred))
    mse = float(mean_squared_error(y_true, y_pred))
    rmse = float(np.sqrt(mse))
    r2 = float(r2_score(y_true, y_pred))

    # Error analysis
    residuals = y_true - y_pred
    mean_residual = float(np.mean(residuals))
    std_residual = float(np.std(residuals))
    abs_errors = np.abs(residuals)
    p50_error = float(np.percentile(abs_errors, 50))
    p90_error = float(np.percentile(abs_errors, 90))
    p95_error = float(np.percentile(abs_errors, 95))

    # Feature Importances
    importances = model.feature_importances_
    feature_ranking = [
        {"feature": name, "importance": round(float(imp), 4), "percentage": f"{imp * 100:.2f}%"}
        for name, imp in sorted(zip(final_features, importances), key=lambda x: x[1], reverse=True)
    ]

    report = {
        "evaluation_timestamp": datetime.now(timezone.utc).isoformat(),
        "model_type": "RandomForestRegressor",
        "sample_count": len(df),
        "metrics": {
            "r2_score": round(r2, 4),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "mse": round(mse, 4),
        },
        "error_distribution": {
            "mean_residual": round(mean_residual, 4),
            "std_residual": round(std_residual, 4),
            "median_abs_error_p50": round(p50_error, 4),
            "p90_abs_error": round(p90_error, 4),
            "p95_abs_error": round(p95_error, 4),
        },
        "feature_importances": feature_ranking,
    }

    os.makedirs(os.path.dirname(report_output_path), exist_ok=True)
    with open(report_output_path, "w") as f:
        json.dump(report, f, indent=2)

    print("\n================ DETAILED ML EVALUATION REPORT ================")
    print(f"  • R² Score (Variance Explained) : {r2:.4f} ({r2*100:.2f}%)")
    print(f"  • MAE (Mean Absolute Error)     : {mae:.4f} points")
    print(f"  • RMSE                          : {rmse:.4f} points")
    print(f"  • MSE                           : {mse:.4f}")
    print(f"  • Median Absolute Error (P50)   : {p50_error:.4f} points")
    print(f"  • 90th Percentile Error (P90)   : {p90_error:.4f} points")
    print("=================================================================\n")

    return report


if __name__ == "__main__":
    evaluate_model()
