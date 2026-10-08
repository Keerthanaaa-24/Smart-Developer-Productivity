"""
Machine Learning API Endpoints
Provides endpoints for predicting developer productivity, fetching live ML insights,
inspecting model performance metrics, and viewing prediction history.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User

from ml.predict import DeveloperActivityInput, get_productivity_predictor
from app.services.ml_service import ml_productivity_service

router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning Productivity"]
)


@router.post("/predict-productivity")
def predict_productivity(
    input_data: DeveloperActivityInput,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Predict developer productivity score (0 - 100) from explicit activity features.
    
    Returns:
      - predicted_productivity_score: ML regression output
      - productivity_level: High / Moderate / Needs Attention
      - recommendation: Personalized data-driven action guidance
      - top_factors: Key drivers impacting the prediction
      - most_productive_time: Peak efficiency time window
      - model_metadata: Version and regression evaluation metrics
    """
    try:
        prediction = ml_productivity_service.predict_custom_features(input_data)
        return prediction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Productivity prediction failed: {str(e)}"
        )


@router.get("/my-productivity")
def get_my_productivity_prediction(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Extracts authenticated user's live database activity telemetry for today,
    runs ML feature engineering and RandomForest inference, saves the prediction,
    and returns personalized developer insights.
    """
    try:
        prediction = ml_productivity_service.predict_for_user(
            db=db,
            user_id=current_user.id,
            save_to_db=True
        )
        return prediction
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate ML productivity score from live telemetry: {str(e)}"
        )


@router.get("/history")
def get_prediction_history(
    limit: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Retrieves the user's historical ML productivity predictions.
    """
    return ml_productivity_service.get_prediction_history(
        db=db,
        user_id=current_user.id,
        limit=min(30, max(1, limit))
    )


@router.get("/model-info")
def get_model_info() -> Dict[str, Any]:
    """
    Returns public metadata and evaluation metrics for the active ML model.
    """
    try:
        predictor = get_productivity_predictor()
        return {
            "model_name": "Developer Productivity RandomForestRegressor",
            "algorithm": "RandomForestRegressor",
            "version": predictor.model_version,
            "metrics": predictor.metrics,
            "feature_count": len(predictor.final_features),
            "features": predictor.final_features,
            "status": "active"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load model metadata: {str(e)}"
        )


@router.post("/retrain")
def retrain_model(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Triggers model retraining pipeline and updates the active joblib artifact.
    """
    try:
        from ml.train_model import train_productivity_model
        metadata = train_productivity_model()
        # Reload predictor singleton
        predictor = get_productivity_predictor()
        predictor._load_model()
        return {
            "message": "Productivity ML model retrained and updated successfully",
            "metadata": metadata
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model retraining failed: {str(e)}"
        )
