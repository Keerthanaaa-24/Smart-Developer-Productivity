from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True)
    email = Column(String(100), unique=True, index=True)
    password = Column(String(255))
    role = Column(String(20), nullable=False, default="student", server_default="student", index=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default="1", index=True)
    suspension_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)