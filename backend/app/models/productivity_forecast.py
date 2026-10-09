"""
Productivity Forecast Model (Phase 3)
Stores 7-day multi-target productivity forecasts, confidence uncertainty intervals,
baseline vs ML model comparisons, and contributing factor snapshots.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    ForeignKey,
    Text,
    Index,
    Boolean,
)
from sqlalchemy.sql import func
from app.core.database import Base


class ProductivityForecast(Base):
    __tablename__ = "productivity_forecasts"

    __table_args__ = (
        Index("ix_pf_user_forecast_date", "user_id", "forecast_date"),
        Index("ix_pf_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Forecast Horizon
    forecast_date = Column(Date, nullable=False, index=True)  # Date the forecast was generated
    horizon_days = Column(Integer, default=7, nullable=False)

    # Target 1: Expected Active Focus/Coding Minutes over next 7 days
    predicted_focus_minutes_7d = Column(Float, nullable=False)
    focus_minutes_lower_bound = Column(Float, nullable=False)
    focus_minutes_upper_bound = Column(Float, nullable=False)
    baseline_focus_minutes_7d = Column(Float, nullable=True)  # Historical 7d rolling average

    # Target 2: Expected Tasks Completed over next 7 days
    predicted_tasks_7d = Column(Float, nullable=False)
    tasks_lower_bound = Column(Float, nullable=False)
    tasks_upper_bound = Column(Float, nullable=False)
    baseline_tasks_7d = Column(Float, nullable=True)

    # Target 3: Goal Completion Probability (0.0 to 1.0)
    goal_met_probability = Column(Float, nullable=False)
    predicted_goal_status = Column(String(50), nullable=False)  # "Likely on track", "Needs push", "At risk"

    # Evaluation & Model Context
    model_version = Column(String(50), default="2.1.0-rf-ridge", nullable=False)
    model_algorithm = Column(String(100), default="RidgeRegression + RandomForest Ensemble", nullable=False)
    data_status = Column(String(50), default="sufficient", nullable=False)  # "sufficient" or "insufficient_data"
    
    # Feature Inputs & Contributing Drivers (JSON-encoded)
    contributing_factors = Column(Text, nullable=True)
    feature_snapshot = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
