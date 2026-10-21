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

    from app.services.points_service import award_points
    try:
        award_points(
            db=db,
            user_id=user_id,
            source_type="project",
            source_id=f"proj_{project.id}",
            points=10,
            category="projects",
            description=f"Project milestone: {project.name}",
        )
    except Exception as pe:
        print("Project points award error:", pe)

    user_cache.invalidate_user(user_id)
    return project


def get_user_projects(
    db: Session,
    user_id: int,
    include_archived: bool = False,
    limit: int | None = None,
    offset: int = 0,
) -> list[dict]:
    query = db.query(Project).filter(Project.user_id == user_id)
    if not include_archived:
        query = query.filter(Project.status != "Archived")
    
    query = query.order_by(desc(Project.updated_at))
    if offset > 0:
        query = query.offset(offset)
    if limit is not None:
        query = query.limit(limit)

    projects = query.all()
    if not projects:
        return []
    
    # 1. Batch load user tasks and activities in single indexed queries to eliminate N+1 roundtrips
    user_tasks = db.query(
        Task.id,
        Task.title,
        Task.description,
        Task.status,
        Task.priority,
        Task.project_id,
    ).filter(Task.user_id == user_id).all()

    user_activities = db.query(
        DeveloperActivity.id,
        DeveloperActivity.title,
        DeveloperActivity.details,
        DeveloperActivity.duration_seconds,
        DeveloperActivity.project_id,
        DeveloperActivity.source,
        DeveloperActivity.platform,
        DeveloperActivity.activity_type,
        DeveloperActivity.activity_date,
        DeveloperActivity.created_at,
    ).filter(DeveloperActivity.user_id == user_id).all()
    
    results = []
    for p in projects:
        p_name_lower = p.name.lower().strip()
        
        # Dual relational + name fallback task matching
        matching_tasks = [
            t for t in user_tasks
            if (t.project_id == p.id)
            or (t.project_id is None and (
                (t.description and p_name_lower in t.description.lower())
                or (t.title and p_name_lower in t.title.lower())
            ))
        ]
        total_tasks = len(matching_tasks)
        completed_tasks = len([t for t in matching_tasks if t.status == "Completed"])
        progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
        
        # Dual relational + name fallback activity coding duration matching
        matching_acts = [
            a for a in user_activities
            if (a.project_id == p.id)
            or (a.project_id is None and (
                (a.title and p_name_lower in a.title.lower())
                or (a.details and p_name_lower in a.details.lower())
            ))
        ]
        total_coding_seconds = sum(a.duration_seconds or 0 for a in matching_acts)
        verified_events_count = len([a for a in matching_acts if a.source in ("vscode_extension", "browser_extension", "github_api")])
        
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
            "verified_events_count": verified_events_count,
            "evidence_backed": (completed_tasks > 0 or total_coding_seconds > 0 or verified_events_count > 0),
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })
    return results


def get_project_timeline(db: Session, project_id: int, user_id: int) -> list[dict]:
    """
    Returns a unified, transparent chronological timeline of activities,
    commits, IDE coding sessions, and completed tasks attributed to this project.
    Distinguishes verified telemetry from self-reported manual milestones.
    """
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user_id).first()
    if not project:
        return []

    p_name_lower = project.name.lower().strip()
    timeline_events = []

    # 1. Associated Tasks
    tasks = db.query(Task).filter(
        Task.user_id == user_id,
        (Task.project_id == project_id) | (Task.description.ilike(f"%{p_name_lower}%")),
    ).all()

    for t in tasks:
        timeline_events.append({
            "id": f"task_{t.id}",
            "type": "task",
            "title": f"Task: {t.title}",
            "status": t.status,
            "priority": t.priority,
            "provenance": "verified_task" if t.status == "Completed" else "planned_task",
            "is_verified": t.status == "Completed",
            "date": str(t.due_date) if t.due_date else None,
            "created_at": None,
        })

    # 2. Associated Activities (VS Code sessions, GitHub events, manual logs)
    activities = db.query(DeveloperActivity).filter(
        DeveloperActivity.user_id == user_id,
        (DeveloperActivity.project_id == project_id)
        | (DeveloperActivity.title.ilike(f"%{p_name_lower}%"))
        | (DeveloperActivity.details.ilike(f"%{p_name_lower}%")),
    ).order_by(desc(DeveloperActivity.created_at)).limit(50).all()

    for a in activities:
        prov = "self_reported"
        is_verified = False
        if a.source == "vscode_extension":
            prov = "verified_ide_telemetry"
            is_verified = True
        elif a.source in ("browser_extension", "github_api"):
            prov = "verified_platform_telemetry"
            is_verified = True
        elif a.source == "task_system":
            prov = "verified_task_completion"
            is_verified = True

        dur_mins = round((a.duration_seconds or 0) / 60)
        dur_label = f"{dur_mins}m" if dur_mins > 0 else "Milestone"

        timeline_events.append({
            "id": f"act_{a.id}",
            "type": a.activity_type or "activity",
            "title": a.title or f"Activity on {a.platform}",
            "details": a.details,
            "duration_seconds": a.duration_seconds or 0,
            "duration_label": dur_label,
            "platform": a.platform,
            "source": a.source,
            "provenance": prov,
            "is_verified": is_verified,
            "date": str(a.activity_date) if a.activity_date else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    # Sort descending by date/created_at
    timeline_events.sort(
        key=lambda x: (x.get("created_at") or x.get("date") or "1970-01-01"),
        reverse=True,
    )
    return timeline_events



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

