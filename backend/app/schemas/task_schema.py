from pydantic import BaseModel
from datetime import date


class TaskCreate(BaseModel):

    title: str

    description: str

    status: str

    priority: str

    due_date: date


class TaskResponse(BaseModel):

    id: int

    title: str

    description: str

    status: str

    priority: str

    due_date: date

    user_id: int

    class Config:
        from_attributes = True