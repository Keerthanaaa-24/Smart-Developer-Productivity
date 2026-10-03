from pydantic import BaseModel, Field
from datetime import date
from typing import Optional


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = ""
    status: Optional[str] = "Pending"
    priority: Optional[str] = "Medium"
    due_date: Optional[date] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[date] = None
    user_id: int

    class Config:
        from_attributes = True