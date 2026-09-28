import os

from datetime import datetime, timedelta

from urllib.parse import urlencode

import httpx

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from app.services.activity_service import (
    log_developer_activity,
)
from fastapi.responses import RedirectResponse

from fastapi.security import OAuth2PasswordBearer

from jose import jwt, JWTError

from sqlalchemy.orm import Session

from app.core.database import get_db

from app.core.oauth2 import get_current_user

from app.models.user import User

from app.models.github_connection import (
    GitHubConnection,
)

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
)

from app.services.developer_streak_service import (
    record_activity,
)


router = APIRouter(
    prefix="/github",
    tags=["GitHub Integration"],
)


# =========================================================
# CONFIGURATION
# =========================================================

GITHUB_CLIENT_ID = os.getenv(
    "GITHUB_CLIENT_ID"
)

GITHUB_CLIENT_SECRET = os.getenv(
    "GITHUB_CLIENT_SECRET"
)

GITHUB_REDIRECT_URI = os.getenv(
    "GITHUB_REDIRECT_URI",
    "http://127.0.0.1:8000/github/callback",
)

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "mysecretkey",
)

ALGORITHM = os.getenv(
    "ALGORITHM",
    "HS256",
)

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173",
)

GITHUB_AUTHORIZE_URL = (
    "https://github.com/login/oauth/authorize"
)

GITHUB_TOKEN_URL = (
    "https://github.com/login/oauth/access_token"
)

GITHUB_USER_URL = (
    "https://api.github.com/user"
)


# =========================================================
# AUTHENTICATION
# =========================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def get_current_user_id(
    token: str = Depends(oauth2_scheme),
):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if not user_id:

            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token",
            )

        return int(user_id)

    except (
        JWTError,
        ValueError,
        TypeError,
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token",
        )


# =========================================================
# LOGIN
# =========================================================

@router.get("/login")
def github_login(
    user_id: int = Depends(
        get_current_user_id
    ),
):

    if not GITHUB_CLIENT_ID:

        raise HTTPException(
            status_code=500,
            detail="GITHUB_CLIENT_ID is not configured",
        )

    if not GITHUB_CLIENT_SECRET:

        raise HTTPException(
            status_code=500,
            detail="GITHUB_CLIENT_SECRET is not configured",
        )

    state_payload = {
        "user_id": user_id,
        "purpose": "github_oauth",
        "exp": (
            datetime.utcnow()
            + timedelta(minutes=10)
        ),
    }

    state = jwt.encode(
        state_payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "read:user user:email repo",
        "state": state,
        "allow_signup": "false",
    }

    authorization_url = (
        f"{GITHUB_AUTHORIZE_URL}?"
        f"{urlencode(params)}"
    )

    return {
        "authorization_url":
            authorization_url
    }


# =========================================================
# CALLBACK
# =========================================================

@router.get("/callback")
async def github_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    db: Session = Depends(get_db),
):

    if error:

        message = (
            error_description
            or error
        )

        return RedirectResponse(
            url=(
                f"{FRONTEND_URL}/settings"
                f"?github=error"
                f"&message={message}"
            )
        )

    if not code:

        raise HTTPException(
            status_code=400,
            detail="GitHub authorization code is missing",
        )

    if not state:

        raise HTTPException(
            status_code=400,
            detail="GitHub OAuth state is missing",
        )

    try:

        state_data = jwt.decode(
            state,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = state_data.get(
            "user_id"
        )

        purpose = state_data.get(
            "purpose"
        )

        if not user_id:

            raise HTTPException(
                status_code=400,
                detail="Invalid GitHub OAuth state",
            )

        if purpose != "github_oauth":

            raise HTTPException(
                status_code=400,
                detail="Invalid GitHub OAuth state",
            )

    except JWTError:

        raise HTTPException(
            status_code=400,
            detail="Invalid or expired GitHub OAuth state",
        )

    application_user = (
        db.query(User)
        .filter(
            User.id == int(user_id)
        )
        .first()
    )

    if not application_user:

        raise HTTPException(
            status_code=404,
            detail="Application user not found",
        )

    # -----------------------------------------------------
    # Exchange authorization code
    # -----------------------------------------------------

    async with httpx.AsyncClient(
        timeout=20.0
    ) as client:

        token_response = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id":
                    GITHUB_CLIENT_ID,

                "client_secret":
                    GITHUB_CLIENT_SECRET,

                "code":
                    code,

                "redirect_uri":
                    GITHUB_REDIRECT_URI,
            },
            headers={
                "Accept":
                    "application/json",
            },
        )

    if token_response.status_code != 200:

        raise HTTPException(
            status_code=400,
            detail="Failed to exchange GitHub authorization code",
        )

    token_data = token_response.json()

    access_token = token_data.get(
        "access_token"
    )

    if not access_token:

        raise HTTPException(
            status_code=400,
            detail="GitHub did not return an access token",
        )

    # -----------------------------------------------------
    # Get GitHub user
    # -----------------------------------------------------

    async with httpx.AsyncClient(
        timeout=20.0
    ) as client:

        github_response = await client.get(
            GITHUB_USER_URL,
            headers={
                "Accept":
                    "application/vnd.github+json",

                "Authorization":
                    f"Bearer {access_token}",

                "X-GitHub-Api-Version":
                    "2022-11-28",
            },
        )

    if github_response.status_code != 200:

        raise HTTPException(
            status_code=400,
            detail="Unable to retrieve GitHub account",
        )

    github_user = github_response.json()

    github_id = str(
        github_user.get("id")
    )

    github_username = (
        github_user.get("login")
    )

    if not github_id or not github_username:

        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub account information",
        )

    # -----------------------------------------------------
    # Save connection
    # -----------------------------------------------------

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == int(user_id)
        )
        .first()
    )

    if connection:

        connection.github_id = github_id

        connection.github_username = (
            github_username
        )

        connection.github_name = (
            github_user.get("name")
        )

        connection.github_email = (
            github_user.get("email")
        )

        connection.avatar_url = (
            github_user.get("avatar_url")
        )

        connection.access_token = (
            access_token
        )

    else:

        existing_github = (
            db.query(GitHubConnection)
            .filter(
                GitHubConnection.github_id
                == github_id
            )
            .first()
        )

        if existing_github:

            raise HTTPException(
                status_code=409,
                detail=(
                    "This GitHub account is already "
                    "connected to another account."
                ),
            )

        connection = GitHubConnection(
            user_id=int(user_id),
            github_id=github_id,
            github_username=github_username,
            github_name=github_user.get("name"),
            github_email=github_user.get("email"),
            avatar_url=github_user.get("avatar_url"),
            access_token=access_token,
        )

        db.add(connection)

    db.commit()

    return RedirectResponse(
        url=(
            f"{FRONTEND_URL}/settings"
            f"?github=connected"
        )
    )


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

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id
            == user_id
        )
        .first()
    )

    if not connection:

        return {
            "connected": False,
            "message":
                "GitHub account is not connected",
        }

    return {
        "connected": True,

        "github": {
            "username":
                connection.github_username,

            "name":
                connection.github_name,

            "email":
                connection.github_email,

            "avatar_url":
                connection.avatar_url,

            "connected_at":
                connection.connected_at,
        },
    }


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
# RECENT ACTIVITY
# =========================================================

@router.get("/activity")
async def github_activity(
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

        activity = await get_github_activity(
            connection.access_token,
            connection.github_username,
        )

        # -------------------------------------------------
        # GitHub activity counts toward the developer streak
        # -------------------------------------------------

        if activity:

            record_activity(
                db=db,
                user_id=user_id,
                platform="github",
                activity_type="github_activity",
                activity_count=1,
            )

        return {
            "count":
                len(activity),

            "activity":
                activity,
        }

    except Exception as error:

        print(
            "GitHub activity error:",
            error
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub activity",
        )


# =========================================================
# GITHUB STATISTICS
# =========================================================

@router.get("/statistics")
async def github_statistics(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id == user_id
        )
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

        # GitHub statistics request also confirms
        # that the connected developer is active.
        if statistics:

            record_activity(
                db=db,
                user_id=user_id,
                platform="github",
                activity_type="github_statistics",
                activity_count=1,
            )

        return statistics

    except Exception as error:

        print(
            "GitHub statistics error:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub statistics",
        )


# =========================================================
# GITHUB STREAK
# =========================================================

@router.get("/streak")
async def github_streak(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id == user_id
        )
        .first()
    )

    if not connection:

        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:

        return await get_github_contribution_streak(
            connection.access_token,
            connection.github_username,
        )

    except Exception as error:

        print(
            "GitHub streak error:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to fetch GitHub contribution streak",
        )


# =========================================================
# DAILY CONTRIBUTIONS
# =========================================================

@router.get("/daily-contributions")
async def github_daily_contributions(
    user_id: int = Depends(
        get_current_user_id
    ),
    db: Session = Depends(get_db),
):

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id == user_id
        )
        .first()
    )

    if not connection:

        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected",
        )

    try:

        contributions = (
            await get_github_daily_contributions(
                connection.access_token,
                connection.github_username,
            )
        )

        # -------------------------------------------------
        # If GitHub has contribution activity today,
        # count today as a developer-active day.
        #
        # The actual cross-platform streak will later
        # combine this with LeetCode, GFG, FCC, NPTEL
        # and Coursera.
        # -------------------------------------------------

        today = datetime.utcnow().date()

        today_has_contribution = any(
            day.get("date") == str(today)
            and int(day.get("count", 0)) > 0
            for day in contributions.get(
                "days",
                [],
            )
        )

        if today_has_contribution:

            record_activity(
                db=db,
                user_id=user_id,
                platform="github",
                activity_type="github_contribution",
                activity_count=1,
            )

        return contributions

    except Exception as error:

        print(
            "GitHub daily contributions error:",
            error,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to fetch GitHub daily contributions"
            ),
        )