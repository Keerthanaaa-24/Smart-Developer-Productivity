from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.services.portfolio_service import portfolio_service
from app.schemas.portfolio_schema import PortfolioSettingsUpdate

router = APIRouter(prefix="/portfolio", tags=["Portfolio & Public Profile"])


@router.get("/me")
def get_my_portfolio_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the authenticated user's portfolio settings and configured profile.
    """
    portfolio = portfolio_service.get_or_create_portfolio(db, current_user.id)
    preview = portfolio_service.get_public_portfolio(db, portfolio.custom_slug)
    return {
        "settings": {
            "id": portfolio.id,
            "custom_slug": portfolio.custom_slug,
            "is_public_portfolio_enabled": portfolio.is_public_portfolio_enabled,
            "headline": portfolio.headline,
            "about_me": portfolio.about_me,
            "location": portfolio.location,
            "website_url": portfolio.website_url,
            "linkedin_url": portfolio.linkedin_url,
            "github_url": portfolio.github_url,
            "twitter_url": portfolio.twitter_url,
            "contact_email_public": portfolio.contact_email_public,
            "public_contact_note": portfolio.public_contact_note,
            "show_github_stats": portfolio.show_github_stats,
            "show_coding_stats": portfolio.show_coding_stats,
            "show_learning_milestones": portfolio.show_learning_milestones,
            "show_career_readiness": portfolio.show_career_readiness,
            "show_skill_badges": portfolio.show_skill_badges,
            "show_featured_projects": portfolio.show_featured_projects,
            "featured_project_ids": portfolio.featured_project_ids,
        },
        "preview": preview,
    }


@router.put("/me")
def update_my_portfolio_settings(
    payload: PortfolioSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates the authenticated user's portfolio settings, custom slug, and privacy toggles.
    """
    update_dict = payload.model_dump(exclude_unset=True)
    updated = portfolio_service.update_portfolio(db, current_user.id, update_dict)
    return {
        "message": "Portfolio settings updated successfully.",
        "custom_slug": updated.custom_slug,
        "is_public_portfolio_enabled": updated.is_public_portfolio_enabled,
    }


@router.get("/public/{slug}")
def get_public_recruiter_portfolio(
    slug: str,
    db: Session = Depends(get_db),
):
    """
    PUBLIC ENDPOINT: Recruiter-ready developer portfolio view.
    Never exposes internal IDs, passwords, OAuth tokens, or private activity logs.
    """
    if not slug or len(slug.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid portfolio slug provided.",
        )
    return portfolio_service.get_public_portfolio(db, slug)


@router.get("/export/resume")
def export_portfolio_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns structured JSON data formatted for printable resume rendering.
    """
    return portfolio_service.export_resume_data(db, current_user.id)
