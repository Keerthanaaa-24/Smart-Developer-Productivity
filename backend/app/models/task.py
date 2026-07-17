from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import ForeignKey
from sqlalchemy import Date

from app.core.database import Base


class Task(Base):

    __tablename__ = "tasks"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(String(255))

    description = Column(String(500))

    status = Column(String(50))

    priority = Column(String(50))

    due_date = Column(Date)

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )