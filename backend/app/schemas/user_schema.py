from pydantic import BaseModel, EmailStr, field_validator

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        cleaned = (v or "").strip()
        if len(cleaned) < 3:
            raise ValueError("Username must be at least 3 characters long")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: EmailStr) -> str:
        return str(v).strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v or len(v) < 6:
            raise ValueError("Password must contain at least 6 characters")
        return v


class UserResponse(BaseModel):

    id: int

    username: str

    email: EmailStr

    class Config:
        from_attributes = True