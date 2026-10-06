from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.cache import user_cache
from app.models.project import Project
from app.models.task import Task
from app.models.developer_activity import DeveloperActivity


def create_project(
    db: Session,
    user_id: int,
    name: str,
    description: str | None = None,
    tech_stack: str | None = None,
    status: str = "In Progress",
    github_repo_url: str | None = None,
) -> Project:
    project = Project(
        user_id=user_id,
        name=name.strip(),
        description=description.strip() if description else None,
        tech_stack=tech_stack.strip() if tech_stack else None,
        status=status.strip() if status else "In Progress",
        github_repo_url=github_repo_url.strip() if github_repo_url else None,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    user_cache.invalidate_user(user_id)
    return project


def get_user_projects(db: Session, user_id: int, include_archived: bool = False) -> list[dict]:
    query = db.query(Project).filter(Project.user_id == user_id)
    if not include_archived:
        query = query.filter(Project.status != "Archived")
    
    projects = query.order_by(desc(Project.updated_at)).all()
    if not projects:
        return []
    
    # 1. Batch load user tasks and activities in single indexed queries to eliminate N+1 roundtrips
    user_tasks = db.query(Task.description, Task.status).filter(Task.user_id == user_id).all()
    user_activities = db.query(
        DeveloperActivity.title,
        DeveloperActivity.details,
        DeveloperActivity.duration_seconds
    ).filter(DeveloperActivity.user_id == user_id).all()
    
    results = []
    for p in projects:
        p_name_lower = p.name.lower().strip()
        
        # In-memory task matching
        matching_tasks = [t for t in user_tasks if t.description and p_name_lower in t.description.lower()]
        total_tasks = len(matching_tasks)
        completed_tasks = len([t for t in matching_tasks if t.status == "Completed"])
        progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
        
        # In-memory activity coding duration matching
        matching_acts = [
            a for a in user_activities
            if (a.title and p_name_lower in a.title.lower()) or (a.details and p_name_lower in a.details.lower())
        ]
        total_coding_seconds = sum(a.duration_seconds or 0 for a in matching_acts)
        
        results.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "tech_stack": p.tech_stack,
            "status": p.status,
            "github_repo_url": p.github_repo_url,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "progress": progress,
            "coding_seconds": total_coding_seconds,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })
    return results


def get_project_by_id(db: Session, project_id: int, user_id: int) -> dict | None:
    p = db.query(Project).filter(Project.id == project_id, Project.user_id == user_id).first()
    if not p:
        return None
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "tech_stack": p.tech_stack,
        "status": p.status,
        "github_repo_url": p.github_repo_url,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def update_project(
    db: Session,
    project_id: int,
    user_id: int,
    name: str | None = None,
    description: str | None = None,
    tech_stack: str | None = None,
    status: str | None = None,
    github_repo_url: str | None = None,
) -> Project | None:
    p = db.query(Project).filter(Project.id == project_id, Project.user_id == user_id).first()
    if not p:
        return None
    if name is not None:
        p.name = name.strip()
    if description is not None:
        p.description = description.strip()
    if tech_stack is not None:
        p.tech_stack = tech_stack.strip()
    if status is not None:
        p.status = status.strip()
    if github_repo_url is not None:
        p.github_repo_url = github_repo_url.strip()
    
    db.commit()
    db.refresh(p)
    user_cache.invalidate_user(user_id)
    return p


def delete_project(db: Session, project_id: int, user_id: int) -> bool:
    p = db.query(Project).filter(Project.id == project_id, Project.user_id == user_id).first()
    if not p:
        return False
    db.delete(p)
    db.commit()
    user_cache.invalidate_user(user_id)
    return True

