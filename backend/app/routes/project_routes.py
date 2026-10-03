from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.services.project_service import (
    create_project,
    get_user_projects,
    get_project_by_id,
    update_project,
    delete_project,
)

router = APIRouter(
    prefix="/projects",
    tags=["Projects Portfolio"],
)


class ProjectCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: str | None = None
    tech_stack: str | None = None
    status: str = Field(default="In Progress", description="Planned, In Progress, Completed, Archived")
    github_repo_url: str | None = None


class ProjectUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    tech_stack: str | None = None
    status: str | None = None
    github_repo_url: str | None = None


@router.get("")
def list_projects(
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_user_projects(db, current_user.id, include_archived=include_archived)


@router.post("")
def add_project(
    payload: ProjectCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_proj = create_project(
        db=db,
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        tech_stack=payload.tech_stack,
        status=payload.status,
        github_repo_url=payload.github_repo_url,
    )
    return {
        "message": "Project created successfully",
        "project": {
            "id": new_proj.id,
            "name": new_proj.name,
            "description": new_proj.description,
            "tech_stack": new_proj.tech_stack,
            "status": new_proj.status,
            "github_repo_url": new_proj.github_repo_url,
        },
    }


@router.get("/{project_id}")
def get_single_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = get_project_by_id(db, project_id, current_user.id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj


@router.put("/{project_id}")
def edit_project(
    project_id: int,
    payload: ProjectUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    proj = update_project(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
        tech_stack=payload.tech_stack,
        status=payload.status,
        github_repo_url=payload.github_repo_url,
    )
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "message": "Project updated successfully",
        "project": {
            "id": proj.id,
            "name": proj.name,
            "description": proj.description,
            "tech_stack": proj.tech_stack,
            "status": proj.status,
            "github_repo_url": proj.github_repo_url,
        },
    }


@router.delete("/{project_id}")
def remove_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = delete_project(db, project_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully", "id": project_id}
