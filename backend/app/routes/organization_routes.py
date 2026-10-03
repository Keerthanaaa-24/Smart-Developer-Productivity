import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.models.user import User
from app.models.organization import Organization, OrganizationMember, OrganizationRepository
from app.models.developer_activity import DeveloperActivity

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations & Workspaces"],
)


# =========================================================
# SCHEMAS
# =========================================================

class CreateOrganizationRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = None
    slug: str | None = None


class AddMemberRequest(BaseModel):
    email_or_username: str
    role: str = "member"  # admin, member


class AddRepoRequest(BaseModel):
    name: str
    full_name: str
    github_repo_id: str
    html_url: str | None = None
    is_private: bool = False
    default_branch: str = "main"
    language: str | None = None


# =========================================================
# HELPERS
# =========================================================

def _slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")


def _get_membership(db: Session, org_id: int, user_id: int) -> OrganizationMember | None:
    return (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == user_id,
        )
        .first()
    )


# =========================================================
# ROUTES
# =========================================================

@router.post("", status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: CreateOrganizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_slug = payload.slug.strip() if payload.slug else _slugify(payload.name)
    if not base_slug:
        base_slug = f"org-{current_user.id}-{int(datetime.utcnow().timestamp())}"

    # Ensure unique slug
    candidate_slug = base_slug
    idx = 1
    while db.query(Organization).filter(Organization.slug == candidate_slug).first():
        candidate_slug = f"{base_slug}-{idx}"
        idx += 1

    org = Organization(
        name=payload.name.strip(),
        slug=candidate_slug,
        description=payload.description,
        owner_id=current_user.id,
    )
    db.add(org)
    db.flush()

    # Add creator as owner member
    owner_member = OrganizationMember(
        org_id=org.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(owner_member)
    db.commit()
    db.refresh(org)

    return {
        "message": "Organization created successfully",
        "organization": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "owner_id": org.owner_id,
            "role": "owner",
            "created_at": org.created_at,
        },
    }


@router.get("")
def list_my_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    memberships = (
        db.query(OrganizationMember, Organization)
        .join(Organization, OrganizationMember.org_id == Organization.id)
        .filter(OrganizationMember.user_id == current_user.id)
        .all()
    )

    results = []
    for member, org in memberships:
        member_count = db.query(OrganizationMember).filter(OrganizationMember.org_id == org.id).count()
        repo_count = db.query(OrganizationRepository).filter(OrganizationRepository.org_id == org.id).count()
        results.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "owner_id": org.owner_id,
            "role": member.role,
            "member_count": member_count,
            "repository_count": repo_count,
            "created_at": org.created_at,
        })

    return {"organizations": results, "count": len(results)}


@router.get("/{org_id}")
def get_organization_details(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = _get_membership(db, org_id, current_user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this organization")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    members = (
        db.query(OrganizationMember, User)
        .join(User, OrganizationMember.user_id == User.id)
        .filter(OrganizationMember.org_id == org_id)
        .all()
    )
    members_list = [
        {
            "user_id": u.id,
            "username": u.username,
            "email": u.email,
            "role": m.role,
            "joined_at": m.joined_at,
        }
        for m, u in members
    ]

    repos = db.query(OrganizationRepository).filter(OrganizationRepository.org_id == org_id).all()
    repos_list = [
        {
            "id": r.id,
            "name": r.name,
            "full_name": r.full_name,
            "github_repo_id": r.github_repo_id,
            "html_url": r.html_url,
            "is_private": r.is_private,
            "language": r.language,
            "default_branch": r.default_branch,
        }
        for r in repos
    ]

    return {
        "organization": {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "description": org.description,
            "owner_id": org.owner_id,
            "role": membership.role,
            "created_at": org.created_at,
        },
        "members": members_list,
        "repositories": repos_list,
    }


@router.post("/{org_id}/members")
def add_organization_member(
    org_id: int,
    payload: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = _get_membership(db, org_id, current_user.id)
    if not membership or membership.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Only organization owners and admins can invite members")

    # Find user to add
    target_user = (
        db.query(User)
        .filter((User.email == payload.email_or_username) | (User.username == payload.email_or_username))
        .first()
    )
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found with provided username or email")

    # Check if already a member
    existing = _get_membership(db, org_id, target_user.id)
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this organization")

    new_member = OrganizationMember(
        org_id=org_id,
        user_id=target_user.id,
        role="admin" if payload.role == "admin" else "member",
    )
    db.add(new_member)
    db.commit()

    return {
        "message": f"Added {target_user.username} to organization",
        "member": {
            "user_id": target_user.id,
            "username": target_user.username,
            "email": target_user.email,
            "role": new_member.role,
            "joined_at": new_member.joined_at,
        },
    }


@router.delete("/{org_id}/members/{target_user_id}")
def remove_organization_member(
    org_id: int,
    target_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = _get_membership(db, org_id, current_user.id)
    if not membership or membership.role not in ["owner", "admin"]:
        # Users can remove themselves (leave org)
        if current_user.id != target_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to remove members")

    target_membership = _get_membership(db, org_id, target_user_id)
    if not target_membership:
        raise HTTPException(status_code=404, detail="Membership record not found")

    if target_membership.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the organization owner")

    db.delete(target_membership)
    db.commit()

    return {"message": "Organization member removed successfully"}


@router.post("/{org_id}/repositories")
def link_organization_repository(
    org_id: int,
    payload: AddRepoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = _get_membership(db, org_id, current_user.id)
    if not membership or membership.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Only organization owners and admins can link repositories")

    existing_repo = (
        db.query(OrganizationRepository)
        .filter(
            OrganizationRepository.org_id == org_id,
            OrganizationRepository.github_repo_id == payload.github_repo_id,
        )
        .first()
    )
    if existing_repo:
        raise HTTPException(status_code=400, detail="Repository is already linked to this organization")

    repo = OrganizationRepository(
        org_id=org_id,
        name=payload.name,
        full_name=payload.full_name,
        github_repo_id=payload.github_repo_id,
        html_url=payload.html_url,
        is_private=payload.is_private,
        default_branch=payload.default_branch,
        language=payload.language,
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    return {"message": "Repository linked to organization successfully", "repository": repo}


@router.get("/{org_id}/activity")
def get_organization_activity(
    org_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = _get_membership(db, org_id, current_user.id)
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this organization")

    activities = (
        db.query(DeveloperActivity)
        .filter(DeveloperActivity.org_id == org_id)
        .order_by(DeveloperActivity.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )

    return {
        "org_id": org_id,
        "count": len(activities),
        "activities": activities,
    }
