from sqlalchemy import Column, Integer, String, ForeignKey, Date, Index

from app.core.database import Base


class Task(Base):

    __tablename__ = "tasks"

    __table_args__ = (
        Index("ix_tasks_user_status", "user_id", "status"),
        Index("ix_tasks_user_due_date", "user_id", "due_date"),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(String(255))

    description = Column(String(500))

    status = Column(String(50), index=True)

    priority = Column(String(50))

    due_date = Column(Date, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )