import os
from datetime import datetime, timedelta
from urllib.parse import urlencode, quote_plus
import httpx
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
)
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.oauth2 import get_current_user
from app.core.encryption import encrypt_token, decrypt_token
from app.core.cache import user_cache
from app.models.user import User
from app.models.github_connection import GitHubConnection
from app.services.activity_service import log_developer_activity
from app.services.github_service import (
    get_github_profile,
    get_github_repositories,
    get_github_commits,
    get_github_pull_requests,
    get_github_issues,
    get_github_languages,
    get_github_activity,
    get_github_statistics,
    get_github_contribution_streak,
    get_github_daily_contributions,
    clear_github_cache,
)
from app.services.developer_streak_service import (
    record_activity,
    get_developer_streak,
)
from app.services.unified_activity_service import (
    record_unified_activity,
)


router = APIRouter(
    prefix="/github",
    tags=["GitHub Integration"],
)


# =========================================================
# CONFIGURATION & DYNAMIC RESOLUTION HELPERS
# =========================================================

GITHUB_CLIENT_ID = settings.GITHUB_CLIENT_ID or os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = settings.GITHUB_CLIENT_SECRET or os.getenv("GITHUB_CLIENT_SECRET")
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
DEFAULT_FRONTEND_URL = settings.FRONTEND_URL

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"


def _resolve_redirect_uri(request: Request) -> str:
    """
    Resolves the exact OAuth redirect URI dynamically:
    1. If GITHUB_REDIRECT_URI is explicitly configured and not defaulting to localhost on remote servers, use it.
    2. Otherwise dynamically derive from the incoming request's host/scheme.
    """
    configured_uri = settings.GITHUB_REDIRECT_URI or os.getenv("GITHUB_REDIRECT_URI")
    
    # Check if request is on a remote host (e.g., on Render or production proxy)
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
    is_remote_host = forwarded_host and not any(h in forwarded_host for h in ("localhost", "127.0.0.1", "0.0.0.0"))

    if configured_uri:
        # If configured for production or matching host, return it
        if not ("127.0.0.1" in configured_uri or "localhost" in configured_uri) or not is_remote_host:
            return configured_uri

    if is_remote_host:
        return f"{forwarded_proto}://{forwarded_host}/github/callback"

    return configured_uri or "http://127.0.0.1:8001/github/callback"


def _resolve_frontend_url(request: Request, state_frontend: str | None = None) -> str:
    """
    Resolves the target frontend application URL (Vercel / Localhost) for post-OAuth redirect.
    """
    if state_frontend and state_frontend.startswith("http"):
        return state_frontend.rstrip("/")

    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin and origin.startswith("http"):
        # Strip trailing path if referer
        parts = origin.split("://", 1)
        if len(parts) == 2:
            domain_part = parts[1].split("/")[0]
            return f"{parts[0]}://{domain_part}"

    return DEFAULT_FRONTEND_URL.rstrip("/")


# =========================================================
# AUTHENTICATION
# =========================================================

def get_current_user_id(
    current_user: User = Depends(get_current_user),
) -> int:
    return current_user.id


# =========================================================
# LOGIN (OAuth Initiation)
# =========================================================

@router.get("/login")
def github_login(
    request: Request,
    user_id: int = Depends(get_current_user_id),
):
    client_id = settings.GITHUB_CLIENT_ID or os.getenv("GITHUB_CLIENT_ID")
    client_secret = settings.GITHUB_CLIENT_SECRET or os.getenv("GITHUB_CLIENT_SECRET")

    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="GITHUB_CLIENT_ID is not configured in backend environment variables.",
        )

    if not client_secret:
        raise HTTPException(
            status_code=500,
            detail="GITHUB_CLIENT_SECRET is not configured in backend environment variables.",
        )

    resolved_redirect_uri = _resolve_redirect_uri(request)
    frontend_url = _resolve_frontend_url(request)

    state_payload = {
        "user_id": user_id,
        "purpose": "github_oauth",
        "redirect_uri": resolved_redirect_uri,
        "frontend_url": frontend_url,
        "exp": datetime.utcnow() + timedelta(minutes=15),
    }

    state = jwt.encode(
        state_payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    params = {
        "client_id": client_id,
        "redirect_uri": resolved_redirect_uri,
        "scope": "read:user user:email repo",
        "state": state,
        "allow_signup": "false",
    }

    authorization_url = f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"

    return {
        "authorization_url": authorization_url,
        "redirect_uri": resolved_redirect_uri,
        "frontend_url": frontend_url,
    }


# =========================================================
# CALLBACK
# =========================================================

@router.get("/callback")
async def github_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
):
    target_frontend = _resolve_frontend_url(request)
    callback_redirect_uri = _resolve_redirect_uri(request)

    if error:
        message = quote_plus(error_description or error or "GitHub authorization was denied or cancelled")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={message}"
        )

    if not code:
        err_msg = quote_plus("GitHub authorization code is missing")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
        )

    if not state:
        err_msg = quote_plus("GitHub OAuth state parameter is missing")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
        )

    try:
        state_data = jwt.decode(
            state,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = state_data.get("user_id")
        purpose = state_data.get("purpose")
        state_frontend = state_data.get("frontend_url")
        state_redirect_uri = state_data.get("redirect_uri")

        if state_frontend:
            target_frontend = state_frontend.rstrip("/")
        if state_redirect_uri:
            callback_redirect_uri = state_redirect_uri

        if not user_id or purpose != "github_oauth":
            err_msg = quote_plus("Invalid GitHub OAuth state payload")
            return RedirectResponse(
                url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
            )

    except JWTError:
        err_msg = quote_plus("Invalid or expired GitHub OAuth state token")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
        )

    application_user = (
        db.query(User)
        .filter(User.id == int(user_id))
        .first()
    )

    if not application_user:
        err_msg = quote_plus("Associated application user account not found")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
        )

    # -----------------------------------------------------
    # Exchange authorization code
    # -----------------------------------------------------

    client_id = settings.GITHUB_CLIENT_ID or os.getenv("GITHUB_CLIENT_ID")
    client_secret = settings.GITHUB_CLIENT_SECRET or os.getenv("GITHUB_CLIENT_SECRET")

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_response = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": callback_redirect_uri,
            },
            headers={"Accept": "application/json"},
        )

    if token_response.status_code != 200:
        err_msg = quote_plus("Failed to exchange GitHub authorization code")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
        )

    token_data = token_response.json()
    access_token = token_data.get("access_token")

    if not access_token:
        err_msg = quote_plus(token_data.get("error_description") or "GitHub did not return an access token")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
        )


    # -----------------------------------------------------
    # Get GitHub user identity
    # -----------------------------------------------------

    async with httpx.AsyncClient(timeout=20.0) as client:
        github_response = await client.get(
            GITHUB_USER_URL,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

    if github_response.status_code != 200:
        err_msg = quote_plus("Unable to retrieve profile from GitHub API")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
        )

    github_user = github_response.json()
    github_id = str(github_user.get("id"))
    github_username = github_user.get("login")

    if not github_id or not github_username:
        err_msg = quote_plus("Invalid GitHub account profile information received")
        return RedirectResponse(
            url=f"{target_frontend}/settings?tab=connected&github=error&message={err_msg}"
        )

    # Encrypt access token at rest
    encrypted_token = encrypt_token(access_token)

    # -----------------------------------------------------
    # Multi-User Identity Protection & Safe Re-Linking
    # -----------------------------------------------------

    existing_github = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.github_id == github_id)
        .first()
    )

    is_relinked = False
    if existing_github and existing_github.user_id != int(user_id):
        # Authenticated user verified ownership via OAuth: safely transfer / re-link to active account
        existing_github.user_id = int(user_id)
        existing_github.github_username = github_username
        existing_github.github_name = github_user.get("name")
        existing_github.github_email = github_user.get("email")
        existing_github.avatar_url = github_user.get("avatar_url")
        existing_github.profile_url = f"https://github.com/{github_username}"
        existing_github.access_token = encrypted_token
        existing_github.token_expired = False
        existing_github.last_sync_status = "success"

        # Remove any other GitHub connection row for this user to maintain strict 1-to-1 mapping
        other_conn = (
            db.query(GitHubConnection)
            .filter(
                GitHubConnection.user_id == int(user_id),
                GitHubConnection.id != existing_github.id,
            )
            .first()
        )
        if other_conn:
            db.delete(other_conn)

        db.commit()
        is_relinked = True
    else:
        # Save or update connection for current application user
        connection = (
            db.query(GitHubConnection)
            .filter(GitHubConnection.user_id == int(user_id))
            .first()
        )

        if connection:
            connection.github_id = github_id
            connection.github_username = github_username
            connection.github_name = github_user.get("name")
            connection.github_email = github_user.get("email")
            connection.avatar_url = github_user.get("avatar_url")
            connection.profile_url = f"https://github.com/{github_username}"
            connection.access_token = encrypted_token
            connection.token_expired = False
            connection.last_sync_status = "success"
        else:
            connection = GitHubConnection(
                user_id=int(user_id),
                github_id=github_id,
                github_username=github_username,
                github_name=github_user.get("name"),
                github_email=github_user.get("email"),
                avatar_url=github_user.get("avatar_url"),
                profile_url=f"https://github.com/{github_username}",
                access_token=encrypted_token,
                token_expired=False,
                last_sync_status="success",
            )
            db.add(connection)

        db.commit()

    # Invalidate user cache and GitHub in-memory cache on OAuth connection/relinking
    user_cache.invalidate_user(int(user_id))
    clear_github_cache(github_username)

    status_param = "relinked" if is_relinked else "connected"
    return RedirectResponse(
        url=f"{target_frontend}/settings?tab=connected&github={status_param}&username={quote_plus(github_username)}"
    )


# =========================================================
# DISCONNECT (Preserves historical developer activities)
# =========================================================

@router.delete("/disconnect")
@router.post("/disconnect")
def github_disconnect(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user_id)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="No connected GitHub account found to disconnect",
        )

    # Delete the connection record without deleting DeveloperActivity history
    saved_username = connection.github_username
    db.delete(connection)
    db.commit()

    # Invalidate user cache and GitHub in-memory cache immediately upon disconnect
    user_cache.invalidate_user(user_id)
    clear_github_cache(saved_username)

    return {
        "message": "GitHub account disconnected successfully",
        "history_preserved": True,
    }


# =========================================================
# STATUS
# =========================================================

@router.get("/status")
def github_status(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):
    cached = user_cache.get(user_id, "github_status")
    if cached is not None:
        return cached

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == user_id
        )
        .first()
    )

    if not connection:
        res = {
            "connected": False,
            "message": "GitHub account is not connected",
        }
        user_cache.set(user_id, "github_status", res, ttl=30)
        return res

    profile_url = connection.profile_url or f"https://github.com/{connection.github_username}"

    res = {
        "connected": True,
        "username": connection.github_username,
        "profile_url": profile_url,
        "github": {
            "username": connection.github_username,
            "name": connection.github_name,
            "email": connection.github_email,
            "avatar_url": connection.avatar_url,
            "profile_url": profile_url,
            "connected_at": connection.connected_at.isoformat() if connection.connected_at else None,
        },
    }
    user_cache.set(user_id, "github_status", res, ttl=30)
    return res


# =========================================================
# PROFILE
# =========================================================

@router.get("/profile")
async def github_profile(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == user_id
        )
        .first()
    )

    if not connection:

        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:

        profile = await get_github_profile(
            connection.access_token
        )

        return {
            "id":
                profile.get("id"),

            "username":
                profile.get("login"),

            "name":
                profile.get("name"),

            "email":
                profile.get("email"),

            "avatar_url":
                profile.get("avatar_url"),

            "bio":
                profile.get("bio"),

            "company":
                profile.get("company"),

            "location":
                profile.get("location"),

            "public_repos":
                profile.get("public_repos"),

            "followers":
                profile.get("followers"),

            "following":
                profile.get("following"),
        }

    except Exception as error:

        print(
            "GitHub profile error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub profile",
        )


# =========================================================
# REPOSITORIES
# =========================================================

@router.get("/repositories")
async def github_repositories(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == user_id
        )
        .first()
    )

    if not connection:

        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:

        repositories = (
            await get_github_repositories(
                connection.access_token
            )
        )

        result = []

        for repo in repositories:

            result.append({
                "id":
                    repo.get("id"),

                "name":
                    repo.get("name"),

                "full_name":
                    repo.get("full_name"),

                "description":
                    repo.get("description"),

                "private":
                    repo.get("private"),

                "html_url":
                    repo.get("html_url"),

                "language":
                    repo.get("language"),

                "stars":
                    repo.get(
                        "stargazers_count",
                        0,
                    ),

                "forks":
                    repo.get(
                        "forks_count",
                        0,
                    ),

                "open_issues":
                    repo.get(
                        "open_issues_count",
                        0,
                    ),

                "watchers":
                    repo.get(
                        "watchers_count",
                        0,
                    ),

                "default_branch":
                    repo.get(
                        "default_branch"
                    ),

                "created_at":
                    repo.get(
                        "created_at"
                    ),

                "updated_at":
                    repo.get(
                        "updated_at"
                    ),

                "pushed_at":
                    repo.get(
                        "pushed_at"
                    ),
            })

        return {
            "count":
                len(result),

            "repositories":
                result,
        }

    except Exception as error:

        print(
            "GitHub repositories error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub repositories",
        )


# =========================================================
# COMMITS
# =========================================================

@router.get("/commits")
async def github_commits(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == user_id
        )
        .first()
    )

    if not connection:

        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:

        commits = await get_github_commits(
            connection.access_token,
            connection.github_username,
        )

        return {
            "count":
                len(commits),

            "commits":
                commits,
        }

    except Exception as error:

        print(
            "GitHub commits error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub commits",
        )


# =========================================================
# PULL REQUESTS
# =========================================================

@router.get("/pull-requests")
async def github_pull_requests(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == user_id
        )
        .first()
    )

    if not connection:

        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:

        pull_requests = (
            await get_github_pull_requests(
                connection.access_token,
                connection.github_username,
            )
        )

        return {
            "count":
                len(pull_requests),

            "pull_requests":
                pull_requests,
        }

    except Exception as error:

        print(
            "GitHub pull requests error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub pull requests",
        )


# =========================================================
# ISSUES
# =========================================================

@router.get("/issues")
async def github_issues(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == user_id
        )
        .first()
    )

    if not connection:

        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:

        issues = await get_github_issues(
            connection.access_token,
            connection.github_username,
        )

        return {
            "count":
                len(issues),

            "issues":
                issues,
        }

    except Exception as error:

        print(
            "GitHub issues error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub issues",
        )


# =========================================================
# LANGUAGES
# =========================================================

@router.get("/languages")
async def github_languages(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == user_id
        )
        .first()
    )

    if not connection:

        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:

        languages = await get_github_languages(
            connection.access_token
        )

        return {
            "languages":
                languages,
        }

    except Exception as error:

        print(
            "GitHub languages error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub languages",
        )


# =========================================================
# =========================================================
# RECENT ACTIVITY
# =========================================================

@router.get("/activity")
async def github_activity(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user_id)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:
        activity = await get_github_activity(
            connection.access_token,
            connection.github_username,
        )

        return {
            "count": len(activity),
            "activity": activity,
        }

    except Exception as error:
        print("GitHub activity error:", error)
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub activity",
        )


# =========================================================
# GITHUB STATISTICS
# =========================================================

@router.get("/statistics")
async def github_statistics(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user_id)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:
        statistics = await get_github_statistics(
            connection.access_token,
            connection.github_username,
        )
        return statistics

    except Exception as error:
        print("GitHub statistics error:", error)
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub statistics",
        )


# =========================================================
# GITHUB STREAK
# =========================================================

@router.get("/streak")
async def github_streak(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user_id)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:
        # 1. Unified streak from developer streak service
        unified = get_developer_streak(db, user_id)

        # 2. Raw GitHub contribution calendar metrics
        cal_streak = await get_github_contribution_streak(
            connection.access_token,
            connection.github_username,
        )

        return {
            "current_streak": unified["current_streak"],
            "longest_streak": unified["longest_streak"],
            "today_active": unified["today_active"],
            "today_platforms": unified["today_platforms"],
            "total_active_days": unified["total_active_days"],
            "last_active_date": unified["last_active_date"],
            "github_total_contributions": cal_streak.get("total_contributions", 0),
            "github_calendar_streak": cal_streak.get("current_streak", 0),
        }

    except Exception as error:
        print("GitHub streak error:", error)
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub contribution streak",
        )


# =========================================================
# DAILY CONTRIBUTIONS
# =========================================================

@router.get("/daily-contributions")
async def github_daily_contributions(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user_id)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:
        contributions = await get_github_daily_contributions(
            connection.access_token,
            connection.github_username,
        )

        today = datetime.utcnow().date()

        # Idempotently sync verified contribution days into developer_activity
        for day in contributions.get("days", []):
            count = int(day.get("count", 0))
            date_str = day.get("date")
            if count > 0 and date_str:
                try:
                    act_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                    if act_date <= today:
                        record_unified_activity(
                            db=db,
                            user_id=user_id,
                            platform="github",
                            category="coding",
                            activity_type="commit_contribution",
                            title=f"GitHub Contribution: {count} contribution{'s' if count != 1 else ''}",
                            message=f"{count} GitHub contribution{'s' if count != 1 else ''} recorded",
                            details=f"Verified GitHub contributions on {date_str} for @{connection.github_username}",
                            duration_seconds=0,
                            activity_date=act_date,
                            source="github_api",
                            external_id=f"gh_cal_{date_str}",
                            activity_count=count,
                        )
                except Exception:
                    pass

        return contributions

    except Exception as error:
        print("GitHub daily contributions error:", error)
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub daily contributions",
        )