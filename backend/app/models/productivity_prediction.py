from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Index
from sqlalchemy.sql import func
from app.core.database import Base


class ProductivityPrediction(Base):
    __tablename__ = "productivity_predictions"

    __table_args__ = (
        Index("ix_prod_pred_user_date", "user_id", "prediction_date"),
        Index("ix_prod_pred_user_created", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    predicted_score = Column(Float, nullable=False)
    productivity_level = Column(String(50), nullable=False)  # High, Moderate, Needs Attention

    coding_minutes = Column(Float, default=0.0, nullable=False)
    tasks_completed = Column(Integer, default=0, nullable=False)
    tasks_planned = Column(Integer, default=0, nullable=False)
    pomodoro_sessions = Column(Integer, default=0, nullable=False)
    pomodoro_minutes = Column(Float, default=0.0, nullable=False)
    github_commits = Column(Integer, default=0, nullable=False)
    goal_completion_rate = Column(Float, default=0.0, nullable=False)
    focus_score = Column(Float, default=0.0, nullable=False)

    recommendation = Column(Text, nullable=True)
    top_factors = Column(Text, nullable=True)  # JSON-encoded array of key factors
    most_productive_time = Column(String(100), nullable=True)

    prediction_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
