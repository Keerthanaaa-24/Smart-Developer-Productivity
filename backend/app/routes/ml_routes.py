"""
Machine Learning & Developer Intelligence API Routes (Phase 3)
Provides authenticated endpoints for:
- Dataset ML Readiness & Feature Audit
- 7-Day Multi-Target Productivity Forecasting
- Explainable Career-Readiness Assessment
- Intelligent Skill-Gap Analysis against Job Descriptions
- Personalized & Actionable Recommendation Engine
- Model Status & Metadata
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User

from ml.predict import DeveloperActivityInput, get_productivity_predictor
from app.services.ml_service import ml_productivity_service
from app.services.ml_readiness_service import ml_readiness_service
from app.services.productivity_forecasting_service import productivity_forecasting_service
from app.services.career_readiness_service import career_readiness_service
from app.services.skill_gap_service import skill_gap_service
from app.services.recommendation_service import recommendation_service

router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning & Developer Intelligence Engine"],
)


# =========================================================
# SCHEMAS
# =========================================================

class SkillGapAnalyzeRequest(BaseModel):
    target_role: Optional[str] = Field(None, description="Target role name or template key")
    job_description: Optional[str] = Field(None, description="Pasted job description text or technical requirements")


# =========================================================
# 1. DATASET ML READINESS & AUDIT (FEATURE 1)
# =========================================================

@router.get("/readiness")
def get_dataset_ml_readiness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns an honest, transparent audit of the user's telemetry records,
    coverage percentages, data freshness, and ML forecast eligibility.
    """
    try:
        return ml_readiness_service.audit_user_data_readiness(db, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to audit ML readiness: {str(e)}",
        )


# =========================================================
# 2. 7-DAY PRODUCTIVITY FORECASTING (FEATURE 2)
# =========================================================

@router.get("/productivity/forecast")
def get_productivity_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Generates a 7-day multi-target productivity forecast:
    - Expected active focus/coding minutes with 95% uncertainty interval
    - Expected tasks completed
    - Goal achievement probability
    - Contributing positive/negative factors
    - Baseline historical comparison
    """
    try:
        return productivity_forecasting_service.generate_7day_forecast(
            db=db,
            user_id=current_user.id,
            save_to_db=True,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute 7-day productivity forecast: {str(e)}",
        )


# =========================================================
# 3. EXPLAINABLE CAREER-READINESS ASSESSMENT (FEATURE 3)
# =========================================================

@router.get("/career-readiness")
def get_career_readiness_assessment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Computes an explainable, multi-dimensional career readiness index based on
    observed project evidence, coding achievements, learning milestones, and execution discipline.
    """
    try:
        return career_readiness_service.evaluate_career_readiness(db, current_user.id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate career readiness: {str(e)}",
        )


# =========================================================
# 4. INTELLIGENT SKILL-GAP ANALYSIS (FEATURE 4)
# =========================================================

@router.get("/skill-gaps")
def get_skill_gaps_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns pre-populated role blueprints and user's past skill-gap analysis history.
    """
    try:
        templates = skill_gap_service.get_role_templates()
        history = skill_gap_service.get_analysis_history(db, current_user.id, limit=5)
        # Default analysis against Full Stack Engineer
        latest_analysis = skill_gap_service.analyze_skill_gap(
            db=db,
            user_id=current_user.id,
            target_role="full_stack",
            save_to_db=False,
        )
        return {
            "status": "success",
            "role_templates": templates,
            "latest_analysis": latest_analysis,
            "history": history,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch skill gap overview: {str(e)}",
        )


@router.post("/skill-gaps/analyze")
def analyze_skill_gaps(
    payload: SkillGapAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Compares user's demonstrated technical evidence against a selected role or pasted job description.
    """
    try:
        return skill_gap_service.analyze_skill_gap(
            db=db,
            user_id=current_user.id,
            target_role=payload.target_role,
            job_description=payload.job_description,
            save_to_db=True,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skill gap analysis failed: {str(e)}",
        )


@router.delete("/skill-gaps/{analysis_id}")
def delete_skill_gap_analysis(
    analysis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Privacy control: Deletes a stored skill-gap analysis record for the authenticated user.
    """
    success = skill_gap_service.delete_analysis_record(db, current_user.id, analysis_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill gap analysis record not found or unauthorized.",
        )
    return {"status": "success", "message": "Analysis record deleted successfully."}


# =========================================================
# 5. PERSONALIZED RECOMMENDATION ENGINE (FEATURE 5)
# =========================================================

@router.get("/recommendations")
def get_personalized_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns prioritized, actionable recommendations tailored to user's real gaps and goals.
    """
    try:
        recs = recommendation_service.generate_recommendations(db, current_user.id)
        return {
            "status": "success",
            "count": len(recs),
            "recommendations": recs,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}",
        )


@router.post("/recommendations/{rec_id}/complete")
def complete_recommendation(
    rec_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Marks a personalized recommendation as completed.
    """
    result = recommendation_service.complete_recommendation(db, current_user.id, rec_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["message"])
    return result


@router.post("/recommendations/{rec_id}/dismiss")
def dismiss_recommendation(
    rec_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Dismisses a recommendation so it won't be shown again.
    """
    result = recommendation_service.dismiss_recommendation(db, current_user.id, rec_id)
    if result.get("status") == "error":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["message"])
    return result


# =========================================================
# 6. MODEL STATUS & TELEMETRY REGRESSION (FEATURE 6)
# =========================================================

@router.get("/my-productivity")
def get_my_productivity_prediction(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Extracts today's live activity telemetry, runs RandomForest inference,
    and returns personalized developer insights.
    """
    try:
        return ml_productivity_service.predict_for_user(
            db=db,
            user_id=current_user.id,
            save_to_db=True,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate ML productivity score: {str(e)}",
        )


@router.post("/predict-productivity")
def predict_productivity_custom(
    input_data: DeveloperActivityInput,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Executes prediction on explicit custom activity inputs.
    """
    try:
        return ml_productivity_service.predict_custom_features(input_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Productivity prediction failed: {str(e)}",
        )


@router.get("/history")
def get_prediction_history(
    limit: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """
    Retrieves the user's historical ML productivity predictions.
    """
    return ml_productivity_service.get_prediction_history(
        db=db,
        user_id=current_user.id,
        limit=limit,
    )


@router.get("/model-status")
@router.get("/model-info")
def get_model_status() -> Dict[str, Any]:
    """
    Returns public metadata and evaluation metrics for active ML models.
    """
    try:
        predictor = get_productivity_predictor()
        return {
            "status": "operational",
            "active_models": [
                {
                    "name": "7-Day Productivity Forecaster",
                    "algorithm": "RidgeRegression + RandomForest Time-Lagged Ensemble",
                    "version": "2.1.0-forecaster",
                    "evaluation_strategy": "Rolling Time-Series Cross Validation (No Future Leakage)",
                    "status": "active",
                },
                {
                    "name": "Daily Productivity Regressor",
                    "algorithm": "RandomForestRegressor",
                    "version": predictor.model_version,
                    "metrics": predictor.metrics,
                    "features_count": len(predictor.final_features),
                    "status": "active",
                },
                {
                    "name": "Explainable Career Readiness Evaluator",
                    "algorithm": "Multi-Pillar Evidence Weighting Matrix v2.0",
                    "version": "2.0.0",
                    "status": "active",
                },
                {
                    "name": "Technical Skill-Gap Classifier",
                    "algorithm": "Structured Skill Taxonomy & Evidence Linker",
                    "version": "2.0.0",
                    "status": "active",
                },
            ],
            "data_isolation_policy": "Strict per-user data boundaries",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load model status: {str(e)}",
        )
