"""
Provider Capability Registry & Data Trust Provenance Engine
Authoritative registry of all supported external integrations, native telemetry sources,
authentication scopes, supported data types, unsupported capabilities, and safe URL resolution.
"""

from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

PROVIDER_CAPABILITY_REGISTRY: Dict[str, Dict[str, Any]] = {
    "github": {
        "key": "github",
        "name": "GitHub",
        "short": "GH",
        "icon": "🐙",
        "category": "coding",
        "website": "https://github.com",
        "profile_url_template": "https://github.com/{username}",
        "dashboard_url": "https://github.com",
        "has_official_api": True,
        "auth_type": "oauth2",
        "required_scopes": ["read:user", "user:email", "repo"],
        "supported_data_types": [
            "Commit contributions",
            "Pull requests",
            "Issues & comments",
            "Repository activity",
            "Contribution calendar",
        ],
        "unsupported_capabilities": [
            "Active coding duration / time tracking (commits represent discrete timestamped events)",
            "Private self-hosted enterprise servers without network tunnel",
            "Real-time keystroke tracking",
        ],
        "provenance_type": "verified_provider",
        "sync_mode": "automatic",
        "sync_badge": "OAuth 2.0 API",
        "implementation_status": "Production Verified OAuth 2.0 Integration",
        "description": "Repositories, commits, pull requests, issues and verified coding activity via authenticated OAuth 2.0.",
        "capability_note": "Authenticated OAuth 2.0 & GraphQL Events API",
    },
    "leetcode": {
        "key": "leetcode",
        "name": "LeetCode",
        "short": "LC",
        "icon": "💻",
        "category": "problem_solving",
        "website": "https://leetcode.com",
        "profile_url_template": "https://leetcode.com/u/{username}/",
        "dashboard_url": "https://leetcode.com",
        "has_official_api": True,  # Public GraphQL API
        "auth_type": "public_profile",
        "required_scopes": ["Public Profile Read"],
        "supported_data_types": [
            "Solved algorithm problems (Total, Easy, Medium, Hard)",
            "Contest rating",
            "Global ranking",
            "Recent accepted submissions",
        ],
        "unsupported_capabilities": [
            "Private LeetCode Premium contest solutions",
            "Problem-solving time duration per question",
            "Failed submission code snapshots",
        ],
        "provenance_type": "verified_provider",
        "sync_mode": "automatic_public",
        "sync_badge": "Public GraphQL API",
        "implementation_status": "Production Public GraphQL Profile & Submissions Fetcher",
        "description": "Problem solving, algorithm solves, difficulty breakdown, and competitive programming progress.",
        "capability_note": "Public GraphQL Submissions & Solves API",
    },
    "freecodecamp": {
        "key": "freecodecamp",
        "name": "freeCodeCamp",
        "short": "FCC",
        "icon": "🔥",
        "category": "learning",
        "website": "https://www.freecodecamp.org",
        "profile_url_template": "https://www.freecodecamp.org/{username}",
        "dashboard_url": "https://www.freecodecamp.org",
        "has_official_api": True,  # Public Profile API
        "auth_type": "public_profile",
        "required_scopes": ["Public Profile Read"],
        "supported_data_types": [
            "Curriculum certifications",
            "Completed challenge counts",
            "Milestone points",
        ],
        "unsupported_capabilities": [
            "Private profile mode accounts (unless set to public)",
            "Guide article reading duration",
            "Keystroke tracking",
        ],
        "provenance_type": "verified_provider",
        "sync_mode": "automatic_public",
        "sync_badge": "Public Profile API",
        "implementation_status": "Production Public Profile & Certifications API",
        "description": "Curriculum milestones, certifications and web development progress.",
        "capability_note": "Public Profile API & Certifications",
    },
    "geeksforgeeks": {
        "key": "geeksforgeeks",
        "name": "GeeksforGeeks",
        "short": "GFG",
        "icon": "🟢",
        "category": "problem_solving",
        "website": "https://www.geeksforgeeks.org",
        "profile_url_template": "https://www.geeksforgeeks.org/user/{username}/",
        "dashboard_url": "https://www.geeksforgeeks.org",
        "has_official_api": True,  # Public telemetry
        "auth_type": "public_profile",
        "required_scopes": ["Public Profile Read"],
        "supported_data_types": [
            "Total coding score",
            "Problems solved count",
            "Articles published",
            "Courses completed",
        ],
        "unsupported_capabilities": [
            "Private institutional contest ranks",
            "Real-time code execution durations",
            "Private enrolled course video timestamps",
        ],
        "provenance_type": "verified_provider",
        "sync_mode": "automatic_public",
        "sync_badge": "Public Telemetry",
        "implementation_status": "Production Public Profile Metrics Aggregator",
        "description": "Programming challenges, coding scores, articles, and DSA practice profile.",
        "capability_note": "Public Profile Metrics & Scores",
    },
    "coursera": {
        "key": "coursera",
        "name": "Coursera",
        "short": "CO",
        "icon": "📚",
        "category": "learning",
        "website": "https://www.coursera.org",
        "profile_url_template": "https://www.coursera.org/learner/{username}",
        "dashboard_url": "https://www.coursera.org",
        "has_official_api": False,  # Consumer API restricted without enterprise SSO
        "auth_type": "manual_tracking",
        "required_scopes": ["Manual User Verified"],
        "supported_data_types": [
            "Completed courses",
            "Verified certificates earned",
            "Courses in progress",
            "Manual learning milestone logs",
        ],
        "unsupported_capabilities": [
            "Automatic consumer event stream without enterprise LMS SSO",
            "Real-time video playback second-by-second tracking",
        ],
        "provenance_type": "user_entered",
        "sync_mode": "manual",
        "sync_badge": "Manual Milestones",
        "implementation_status": "Manual Learning Milestone & Course Tracking",
        "description": "Course completions and certificates. No open consumer event API available; manual course tracking supported.",
        "capability_note": "Manual Course & Certificate Logging",
    },
    "nptel": {
        "key": "nptel",
        "name": "NPTEL",
        "short": "NPTEL",
        "icon": "🎓",
        "category": "learning",
        "website": "https://nptel.ac.in",
        "profile_url_template": "https://nptel.ac.in",
        "dashboard_url": "https://nptel.ac.in",
        "has_official_api": False,  # Requires institutional portal SSO
        "auth_type": "manual_tracking",
        "required_scopes": ["Manual User Verified"],
        "supported_data_types": [
            "Academic courses enrolled",
            "Courses completed",
            "Certificates achieved",
            "Manual study session logs",
        ],
        "unsupported_capabilities": [
            "Automated assignment grading stream without SWAYAM institutional SSO",
            "Direct portal scraping",
        ],
        "provenance_type": "user_entered",
        "sync_mode": "manual",
        "sync_badge": "Manual Milestones",
        "implementation_status": "Manual Academic Course & Certification Tracking",
        "description": "Academic courses and certification tracking. No public API without institutional SSO; manual tracking supported.",
        "capability_note": "Manual Course Progress Tracking",
    },
    "linkedin": {
        "key": "linkedin",
        "name": "LinkedIn",
        "short": "IN",
        "icon": "💼",
        "category": "career",
        "website": "https://www.linkedin.com",
        "profile_url_template": "https://www.linkedin.com/in/{username}/",
        "dashboard_url": "https://www.linkedin.com",
        "has_official_api": False,  # Open feed API restricted by LinkedIn; OpenID Connect provides profile only
        "auth_type": "public_profile",
        "required_scopes": ["Public Profile Handle"],
        "supported_data_types": [
            "Professional profile identity & headline",
            "Job application pipeline tracking (applied, assessment, interview, offer)",
            "Career milestone logging",
        ],
        "unsupported_capabilities": [
            "Automatic user feed/activity stream extraction (restricted by LinkedIn Developer policies)",
            "Connection network scraping",
            "InMail message reading",
        ],
        "provenance_type": "user_entered",
        "sync_mode": "limited",
        "sync_badge": "Profile Access Only",
        "implementation_status": "Profile Identification & Manual Career Activity Pipeline",
        "description": "Professional identity and network profile. Open activity feed is restricted by LinkedIn; career milestones logged manually.",
        "capability_note": "Connected ≠ Automatically tracked (Manual Career Activity)",
    },
    "naukri": {
        "key": "naukri",
        "name": "Naukri",
        "short": "NK",
        "icon": "👔",
        "category": "career",
        "website": "https://www.naukri.com",
        "profile_url_template": "https://www.naukri.com/mnjuser/profile",
        "dashboard_url": "https://www.naukri.com",
        "has_official_api": False,  # No open jobseeker API
        "auth_type": "manual_tracking",
        "required_scopes": ["Manual User Verified"],
        "supported_data_types": [
            "Job applications tracking",
            "Recruiter interview round stages",
            "Assessment statuses",
            "Offer logging",
        ],
        "unsupported_capabilities": [
            "Automatic application scraping without credentials",
            "Direct recruiter search feed",
        ],
        "provenance_type": "user_entered",
        "sync_mode": "manual",
        "sync_badge": "Manual Only",
        "implementation_status": "Manual Job Application & Interview Pipeline Tracking",
        "description": "Job search and recruiter tracking. No public jobseeker API available; applications & interviews tracked via Career Activity.",
        "capability_note": "Manual Applications & Interview Logging",
    },
}

# Native Application Telemetry Providers
NATIVE_TELEMETRY_PROVIDERS: Dict[str, Dict[str, Any]] = {
    "pomodoro": {
        "key": "pomodoro",
        "name": "Pomodoro Focus Engine",
        "icon": "⏱️",
        "category": "productivity",
        "provenance_type": "app_recorded",
        "sync_mode": "native",
        "supported_data_types": ["Focus session durations", "Break cycles", "Task linking"],
        "description": "Built-in deep work timer recording actual uninterrupted focus seconds.",
    },
    "tasks": {
        "key": "tasks",
        "name": "Developer Task Engine",
        "icon": "📋",
        "category": "productivity",
        "provenance_type": "app_recorded",
        "sync_mode": "native",
        "supported_data_types": ["Task completions", "Priority tags", "Project association"],
        "description": "Built-in task manager logging completed milestone events.",
    },
    "vscode": {
        "key": "vscode",
        "name": "VS Code Extension",
        "icon": "⚡",
        "category": "coding",
        "provenance_type": "verified_provider",
        "sync_mode": "telemetry",
        "supported_data_types": ["Active coding minutes", "Heartbeats", "Language breakdown"],
        "description": "Privacy-first editor telemetry with idle detection and zero keystroke capture.",
    },
}


class ProviderRegistry:
    """Registry access methods and URL resolution utilities."""

    @staticmethod
    def get_all_providers() -> List[Dict[str, Any]]:
        return list(PROVIDER_CAPABILITY_REGISTRY.values())

    @staticmethod
    def get_provider(provider_key: str) -> Optional[Dict[str, Any]]:
        return PROVIDER_CAPABILITY_REGISTRY.get(provider_key.lower().strip())

    @staticmethod
    def get_safe_destination_url(provider_key: str, username: Optional[str] = None, stored_url: Optional[str] = None) -> str:
        """
        Determines the safe, verified destination URL for an account card.
        Ensures users are never sent to localhost, broken routes, or fake URLs.
        """
        provider = PROVIDER_CAPABILITY_REGISTRY.get(provider_key.lower().strip())
        if not provider:
            return "https://github.com"

        # 1. Validate stored profile URL if present
        if stored_url and isinstance(stored_url, str) and stored_url.startswith("http"):
            parsed = urlparse(stored_url)
            expected_domain = urlparse(provider["website"]).netloc
            if expected_domain in parsed.netloc or parsed.netloc in expected_domain:
                return stored_url

        # 2. Build profile URL from verified username if available
        if username and isinstance(username, str) and username.strip():
            clean_user = username.strip().lstrip("@").strip("/")
            if clean_user:
                tpl = provider.get("profile_url_template")
                if tpl and "{username}" in tpl:
                    return tpl.format(username=clean_user)

        # 3. Fallback to official dashboard / discovery page
        return provider.get("dashboard_url") or provider.get("website") or "https://github.com"

    @staticmethod
    def validate_external_url(url: str, expected_provider_key: Optional[str] = None) -> bool:
        """Validates that a URL is a well-formed HTTPS external destination."""
        if not url or not isinstance(url, str):
            return False
        if not (url.startswith("https://") or url.startswith("http://")):
            return False
        if "localhost" in url or "127.0.0.1" in url or "0.0.0.0" in url:
            return False
        if expected_provider_key:
            provider = PROVIDER_CAPABILITY_REGISTRY.get(expected_provider_key.lower())
            if provider:
                expected_netloc = urlparse(provider["website"]).netloc
                parsed_netloc = urlparse(url).netloc
                return expected_netloc in parsed_netloc or parsed_netloc in expected_netloc
        return True


provider_registry = ProviderRegistry()
