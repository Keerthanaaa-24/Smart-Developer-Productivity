from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class PortfolioSettingsUpdate(BaseModel):
    custom_slug: Optional[str] = Field(None, max_length=100)
    is_public_portfolio_enabled: Optional[bool] = None
    headline: Optional[str] = Field(None, max_length=200)
    about_me: Optional[str] = None
    location: Optional[str] = Field(None, max_length=100)
    website_url: Optional[str] = Field(None, max_length=255)
    linkedin_url: Optional[str] = Field(None, max_length=255)
    github_url: Optional[str] = Field(None, max_length=255)
    twitter_url: Optional[str] = Field(None, max_length=255)
    contact_email_public: Optional[bool] = None
    public_contact_note: Optional[str] = Field(None, max_length=255)
    show_github_stats: Optional[bool] = None
    show_coding_stats: Optional[bool] = None
    show_learning_milestones: Optional[bool] = None
    show_career_readiness: Optional[bool] = None
    show_skill_badges: Optional[bool] = None
    show_featured_projects: Optional[bool] = None
    featured_project_ids: Optional[List[int]] = None
    custom_skills: Optional[List[str]] = None


class PublicPortfolioResponse(BaseModel):
    developer_name: str
    custom_slug: str
    headline: str
    about_me: str
    location: str
    public_contact_email: Optional[str] = None
    public_contact_note: Optional[str] = None
    links: Dict[str, Optional[str]]
    career_readiness: Optional[Dict[str, Any]] = None
    github_metrics: Optional[Dict[str, Any]] = None
    coding_metrics: Optional[Dict[str, Any]] = None
    learning_milestones: Optional[List[Dict[str, Any]]] = None
    skills: List[Dict[str, Any]]
    featured_projects: List[Dict[str, Any]]
    provenance_summary: Dict[str, Any]
    last_updated: str
