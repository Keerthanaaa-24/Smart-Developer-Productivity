import asyncio
from datetime import datetime, timedelta
import time

import httpx


GITHUB_API_BASE = "https://api.github.com"
GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

REQUEST_TIMEOUT = httpx.Timeout(
    connect=5.0,
    read=10.0,
    write=10.0,
    pool=5.0,
)

MAX_RETRIES = 2
MAX_REPOSITORIES_FOR_DETAILS = 12

# =========================================================
# IN-MEMORY TTL CACHE
# =========================================================

_GITHUB_CACHE = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def get_cached(key: str):
    if key in _GITHUB_CACHE:
        data, exp = _GITHUB_CACHE[key]
        if time.time() < exp:
            return data
        del _GITHUB_CACHE[key]
    return None


def set_cached(key: str, data, ttl: int = CACHE_TTL_SECONDS):
    _GITHUB_CACHE[key] = (data, time.time() + ttl)


def clear_github_cache():
    _GITHUB_CACHE.clear()



from app.core.encryption import decrypt_token


# =========================================================
# HEADERS
# =========================================================

def github_headers(access_token: str):
    plain_token = decrypt_token(access_token) or access_token
    return {
        **GITHUB_HEADERS,
        "Authorization": f"Bearer {plain_token}",
    }


# =========================================================
# GENERIC GET
# =========================================================

async def github_get(
    access_token: str,
    endpoint: str,
    params: dict | None = None,
    client: httpx.AsyncClient | None = None,
):
    headers = github_headers(access_token)

    owns_client = client is None

    if owns_client:
        client = httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT
        )

    try:

        for attempt in range(MAX_RETRIES):

            try:

                response = await client.get(
                    f"{GITHUB_API_BASE}{endpoint}",
                    headers=headers,
                    params=params,
                )

                # -------------------------------------------------
                # Rate limit
                # -------------------------------------------------

                if response.status_code == 429:

                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(
                            2 ** attempt
                        )
                        continue

                    raise Exception(
                        "GitHub API rate limit exceeded"
                    )

                # -------------------------------------------------
                # Temporary GitHub/server errors
                # -------------------------------------------------

                if response.status_code in {
                    500,
                    502,
                    503,
                    504,
                }:

                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(
                            2 ** attempt
                        )
                        continue

                    raise Exception(
                        f"GitHub API server error "
                        f"{response.status_code}"
                    )

                # -------------------------------------------------
                # Empty repository / no commits
                # -------------------------------------------------

                if response.status_code == 409:

                    if (
                        "empty" in
                        response.text.lower()
                    ):
                        return []

                # -------------------------------------------------
                # Other errors
                # -------------------------------------------------

                if response.status_code != 200:

                    raise Exception(
                        f"GitHub API error "
                        f"{response.status_code}: "
                        f"{response.text}"
                    )

                return response.json()

            except (
                httpx.RemoteProtocolError,
                httpx.ReadError,
                httpx.ConnectError,
                httpx.TimeoutException,
            ) as error:

                if attempt < MAX_RETRIES - 1:

                    print(
                        f"GitHub request retry "
                        f"{attempt + 1}/{MAX_RETRIES}: "
                        f"{error}"
                    )

                    await asyncio.sleep(
                        2 ** attempt
                    )

                    continue

                raise Exception(
                    f"GitHub connection failed: "
                    f"{error}"
                )

    finally:

        if owns_client:
            await client.aclose()


# =========================================================
# GENERIC GRAPHQL
# =========================================================

async def github_graphql(
    access_token: str,
    query: str,
    variables: dict,
    client: httpx.AsyncClient | None = None,
):
    headers = github_headers(access_token)

    owns_client = client is None

    if owns_client:
        client = httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT
        )

    try:

        for attempt in range(MAX_RETRIES):

            try:

                response = await client.post(
                    GITHUB_GRAPHQL_URL,
                    headers=headers,
                    json={
                        "query": query,
                        "variables": variables,
                    },
                )

                if response.status_code in {
                    500,
                    502,
                    503,
                    504,
                }:

                    if attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(
                            2 ** attempt
                        )
                        continue

                if response.status_code != 200:

                    raise Exception(
                        f"GitHub GraphQL error "
                        f"{response.status_code}: "
                        f"{response.text}"
                    )

                data = response.json()

                if data.get("errors"):

                    raise Exception(
                        f"GitHub GraphQL error: "
                        f"{data['errors']}"
                    )

                return data.get(
                    "data",
                    {},
                )

            except (
                httpx.RemoteProtocolError,
                httpx.ReadError,
                httpx.ConnectError,
                httpx.TimeoutException,
            ) as error:

                if attempt < MAX_RETRIES - 1:

                    await asyncio.sleep(
                        2 ** attempt
                    )

                    continue

                raise Exception(
                    f"GitHub GraphQL connection failed: "
                    f"{error}"
                )

    finally:

        if owns_client:
            await client.aclose()


# =========================================================
# PROFILE
# =========================================================

async def get_github_profile(
    access_token: str,
    client: httpx.AsyncClient | None = None,
):
    return await github_get(
        access_token,
        "/user",
        client=client,
    )


# =========================================================
# REPOSITORIES
# =========================================================

async def get_github_repositories(
    access_token: str,
    client: httpx.AsyncClient | None = None,
):
    cache_key = f"repos:{access_token[:16]}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    repositories = []
    page = 1

    while True:
        data = await github_get(
            access_token,
            "/user/repos",
            {
                "visibility": "all",
                "affiliation": (
                    "owner,collaborator,"
                    "organization_member"
                ),
                "sort": "updated",
                "direction": "desc",
                "per_page": 100,
                "page": page,
            },
            client=client,
        )

        if not data:
            break

        repositories.extend(data)

        if len(data) < 100 or page >= 3:
            break

        page += 1

    set_cached(cache_key, repositories, 300)
    return repositories


# =========================================================
# COMMITS
# =========================================================

async def get_github_commits(
    access_token: str,
    username: str,
    repositories=None,
    client: httpx.AsyncClient | None = None,
):
    cache_key = f"commits:{username}:{access_token[:16]}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    if repositories is None:
        repositories = (
            await get_github_repositories(
                access_token,
                client=client,
            )
        )

    repositories = repositories[
        :MAX_REPOSITORIES_FOR_DETAILS
    ]

    sem = asyncio.Semaphore(10)

    async def fetch_repo_commits(repo):
        owner = repo.get("owner", {}).get("login")
        repo_name = repo.get("name")
        if not owner or not repo_name:
            return repo_name, repo.get("html_url"), []
        async with sem:
            try:
                repo_commits = await github_get(
                    access_token,
                    f"/repos/{owner}/{repo_name}/commits",
                    {
                        "author": username,
                        "per_page": 10,
                    },
                    client=client,
                )
                return repo_name, repo.get("html_url"), repo_commits or []
            except Exception:
                return repo_name, repo.get("html_url"), []

    results_raw = await asyncio.gather(
        *[fetch_repo_commits(r) for r in repositories]
    )

    commits = []
    for repo_name, repo_url, repo_commits in results_raw:
        for commit in repo_commits:
            commit_info = commit.get("commit", {})
            author = commit_info.get("author", {})
            commits.append({
                "sha": commit.get("sha"),
                "repository": repo_name,
                "repository_url": repo_url,
                "message": commit_info.get("message"),
                "author": author.get("name"),
                "date": author.get("date"),
                "url": commit.get("html_url"),
            })

    commits.sort(
        key=lambda x: x.get("date") or "",
        reverse=True,
    )

    result = commits[:50]
    set_cached(cache_key, result, 300)
    return result


# =========================================================
# PULL REQUESTS
# =========================================================

async def get_github_pull_requests(
    access_token: str,
    username: str,
    client: httpx.AsyncClient | None = None,
):
    query = f"author:{username} is:pr"

    data = await github_get(
        access_token,
        "/search/issues",
        {
            "q": query,
            "sort": "updated",
            "order": "desc",
            "per_page": 50,
        },
        client=client,
    )

    results = []

    for item in data.get(
        "items",
        [],
    ):

        results.append({
            "id":
                item.get("id"),

            "title":
                item.get("title"),

            "state":
                item.get("state"),

            "repository":
                item.get(
                    "repository_url",
                    "",
                ).split("/")[-1],

            "url":
                item.get("html_url"),

            "created_at":
                item.get("created_at"),

            "updated_at":
                item.get("updated_at"),

            "comments":
                item.get(
                    "comments",
                    0,
                ),

            "labels": [
                label.get("name")
                for label in item.get(
                    "labels",
                    [],
                )
            ],
        })

    return results


# =========================================================
# ISSUES
# =========================================================

async def get_github_issues(
    access_token: str,
    username: str,
    client: httpx.AsyncClient | None = None,
):
    query = f"author:{username} is:issue"

    data = await github_get(
        access_token,
        "/search/issues",
        {
            "q": query,
            "sort": "updated",
            "order": "desc",
            "per_page": 50,
        },
        client=client,
    )

    results = []

    for item in data.get(
        "items",
        [],
    ):

        results.append({
            "id":
                item.get("id"),

            "title":
                item.get("title"),

            "state":
                item.get("state"),

            "repository":
                item.get(
                    "repository_url",
                    "",
                ).split("/")[-1],

            "url":
                item.get("html_url"),

            "created_at":
                item.get("created_at"),

            "updated_at":
                item.get("updated_at"),

            "comments":
                item.get(
                    "comments",
                    0,
                ),

            "labels": [
                label.get("name")
                for label in item.get(
                    "labels",
                    [],
                )
            ],
        })

    return results


# =========================================================
# LANGUAGES
# =========================================================

async def get_github_languages(
    access_token: str,
    repositories=None,
    client: httpx.AsyncClient | None = None,
):
    cache_key = f"lang:{access_token[:16]}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    if repositories is None:
        repositories = (
            await get_github_repositories(
                access_token,
                client=client,
            )
        )

    language_totals = {}

    repositories = repositories[
        :MAX_REPOSITORIES_FOR_DETAILS
    ]

    sem = asyncio.Semaphore(10)

    async def fetch_repo_languages(repo):
        owner = repo.get("owner", {}).get("login")
        repo_name = repo.get("name")
        if not owner or not repo_name:
            return {}
        async with sem:
            try:
                languages = await github_get(
                    access_token,
                    f"/repos/{owner}/{repo_name}/languages",
                    client=client,
                )
                return languages if isinstance(languages, dict) else {}
            except Exception:
                return {}

    lang_results = await asyncio.gather(
        *[fetch_repo_languages(r) for r in repositories]
    )

    for languages in lang_results:
        for language, bytes_count in languages.items():
            language_totals[language] = (
                language_totals.get(
                    language,
                    0,
                )
                + bytes_count
            )

    total = sum(
        language_totals.values()
    )

    results = []

    for (
        language,
        bytes_count,
    ) in sorted(
        language_totals.items(),
        key=lambda item: item[1],
        reverse=True,
    ):

        percentage = (
            round(
                (
                    bytes_count /
                    total
                ) * 100,
                2,
            )
            if total
            else 0
        )

        results.append({
            "language":
                language,

            "bytes":
                bytes_count,

            "percentage":
                percentage,
        })

    set_cached(cache_key, results, 300)
    return results


# =========================================================
# RECENT ACTIVITY
# =========================================================

async def get_github_activity(
    access_token: str,
    username: str,
    client: httpx.AsyncClient | None = None,
):
    events = await github_get(
        access_token,
        f"/users/{username}/events",
        {
            "per_page": 50,
        },
        client=client,
    )

    results = []

    for event in events:

        event_type = event.get("type")

        repo = event.get(
            "repo",
            {},
        )

        payload = event.get(
            "payload",
            {},
        )

        results.append({
            "id":
                event.get("id"),

            "type":
                event_type,

            "repository":
                repo.get("name"),

            "created_at":
                event.get("created_at"),

            "action":
                payload.get("action"),

            "ref":
                payload.get("ref"),

            "url":
                (
                    f"https://github.com/"
                    f"{repo.get('name')}"
                )
                if repo.get("name")
                else None,
        })

    return results


# =========================================================
# =========================================================
# STREAK CALCULATION HELPER
# =========================================================

def calculate_streak_from_calendar_days(days: list, total_contributions: int) -> dict:
    longest_streak = 0
    current_longest = 0
    previous_date = None

    for day in days:
        try:
            date = datetime.strptime(day["date"], "%Y-%m-%d").date()
        except Exception:
            continue

        count = day.get("count", 0)
        if count > 0:
            if previous_date and date == previous_date + timedelta(days=1):
                current_longest += 1
            else:
                current_longest = 1
            longest_streak = max(longest_streak, current_longest)
        else:
            current_longest = 0
        previous_date = date

    current_streak = 0
    today = datetime.utcnow().date()
    contribution_dates = {
        datetime.strptime(day["date"], "%Y-%m-%d").date()
        for day in days
        if day.get("count", 0) > 0
    }

    check_date = today
    if check_date not in contribution_dates:
        yesterday = check_date - timedelta(days=1)
        if yesterday in contribution_dates:
            check_date = yesterday
        else:
            check_date = None

    if check_date:
        while check_date in contribution_dates:
            current_streak += 1
            check_date -= timedelta(days=1)

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "total_contributions": total_contributions,
    }


# =========================================================
# CONTRIBUTION CALENDAR
# =========================================================

async def get_github_contribution_calendar(
    access_token: str,
    username: str,
    client: httpx.AsyncClient | None = None,
):
    cache_key = f"calendar:{username}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    query = """
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
    """

    try:
        data = await github_graphql(
            access_token,
            query,
            {
                "login": username,
            },
            client=client,
        )

        user = data.get("user") if isinstance(data, dict) else None

        if user:
            calendar = (
                user.get(
                    "contributionsCollection",
                    {},
                )
                .get(
                    "contributionCalendar",
                    {},
                )
            )

            days = []
            for week in calendar.get("weeks", []):
                for day in week.get("contributionDays", []):
                    days.append({
                        "date": day.get("date"),
                        "count": day.get("contributionCount", 0),
                    })

            days.sort(key=lambda x: x["date"])

            result = {
                "total_contributions": calendar.get("totalContributions", 0),
                "days": days,
            }
            set_cached(cache_key, result, 300)
            return result
    except Exception as err:
        print("GitHub contribution calendar GraphQL error fallback:", err)

    # Authentic 365-day calendar baseline with 0 count when GraphQL data is unavailable
    today = datetime.utcnow().date()
    days = []
    for i in range(364, -1, -1):
        d = today - timedelta(days=i)
        days.append({"date": d.strftime("%Y-%m-%d"), "count": 0})
    result = {
        "total_contributions": 0,
        "days": days,
    }
    set_cached(cache_key, result, 60)
    return result


# =========================================================
# DAILY CONTRIBUTIONS
# =========================================================

async def get_github_daily_contributions(
    access_token: str,
    username: str,
    client: httpx.AsyncClient | None = None,
):
    return await get_github_contribution_calendar(
        access_token,
        username,
        client=client,
    )


# =========================================================
# GITHUB CONTRIBUTION STREAK
# =========================================================

async def get_github_contribution_streak(
    access_token: str,
    username: str,
    client: httpx.AsyncClient | None = None,
):
    cache_key = f"streak:{username}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    calendar = await get_github_contribution_calendar(
        access_token,
        username,
        client=client,
    )

    result = calculate_streak_from_calendar_days(
        calendar.get("days", []),
        calendar.get("total_contributions", 0),
    )
    set_cached(cache_key, result, 300)
    return result


# =========================================================
# GITHUB STATISTICS
# =========================================================

async def get_github_statistics(
    access_token: str,
    username: str,
):
    """
    High-performance GitHub analytics aggregation.
    Uses single GraphQL query for repos, commits, PRs, issues, calendar, and languages.
    Automatically populates shared caches and falls back to concurrent REST if GraphQL fails.
    Never fabricates mock data.
    """
    cache_key = f"stats:{username}:{access_token[:16]}"
    cached = get_cached(cache_key)
    if cached is not None:
        return cached

    # Attempt high-performance GraphQL overview query
    try:
        query = """
        query($login: String!) {
          user(login: $login) {
            repositories(first: 100, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], orderBy: {field: UPDATED_AT, direction: DESC}) {
              totalCount
              nodes {
                name
                isFork
                primaryLanguage {
                  name
                }
                languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                  edges {
                    size
                    node {
                      name
                    }
                  }
                }
              }
            }
            contributionsCollection {
              totalCommitContributions
              totalPullRequestContributions
              totalIssueContributions
              totalRepositoryContributions
              restrictedContributionsCount
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }
        """

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            graphql_task = github_graphql(
                access_token=access_token,
                query=query,
                variables={"login": username},
                client=client,
            )
            activity_task = get_github_activity(
                access_token=access_token,
                username=username,
                client=client,
            )

            graphql_data, activity_list = await asyncio.gather(
                graphql_task,
                activity_task,
                return_exceptions=True,
            )

            if isinstance(graphql_data, Exception) or not isinstance(graphql_data, dict):
                raise graphql_data if isinstance(graphql_data, Exception) else Exception("Invalid GraphQL response")

            user = graphql_data.get("user")
            if not user:
                raise Exception("User not returned in GraphQL response")

            repos = user.get("repositories", {})
            contrib = user.get("contributionsCollection", {})
            cal = contrib.get("contributionCalendar", {})

            # 1. Days & calendar cache
            days = []
            for week in cal.get("weeks", []):
                for day in week.get("contributionDays", []):
                    days.append({
                        "date": day.get("date"),
                        "count": day.get("contributionCount", 0),
                    })
            days.sort(key=lambda x: x["date"])

            calendar_result = {
                "total_contributions": cal.get("totalContributions", 0),
                "days": days,
            }
            set_cached(f"calendar:{username}", calendar_result, CACHE_TTL_SECONDS)

            # 2. Languages breakdown & cache
            lang_totals = {}
            for repo_node in repos.get("nodes", []):
                for edge in repo_node.get("languages", {}).get("edges", []):
                    lang_name = edge.get("node", {}).get("name")
                    size = edge.get("size", 0)
                    if lang_name:
                        lang_totals[lang_name] = lang_totals.get(lang_name, 0) + size

            total_bytes = sum(lang_totals.values())
            languages_list = []
            for lang_name, bytes_count in sorted(lang_totals.items(), key=lambda x: x[1], reverse=True):
                pct = round((bytes_count / total_bytes) * 100, 2) if total_bytes else 0
                languages_list.append({
                    "language": lang_name,
                    "bytes": bytes_count,
                    "percentage": pct,
                })
            set_cached(f"lang:{access_token[:16]}", languages_list, CACHE_TTL_SECONDS)

            # 3. Streak calculation & cache
            streak = calculate_streak_from_calendar_days(days, cal.get("totalContributions", 0))
            set_cached(f"streak:{username}", streak, CACHE_TTL_SECONDS)

            # 4. Activity
            recent_activity = activity_list if isinstance(activity_list, list) else []

            result = {
                "repositories": {
                    "total": repos.get("totalCount", 0),
                },
                "commits": {
                    "total": contrib.get("totalCommitContributions", 0),
                },
                "pull_requests": {
                    "total": contrib.get("totalPullRequestContributions", 0),
                },
                "issues": {
                    "total": contrib.get("totalIssueContributions", 0),
                },
                "languages": {
                    "total": len(languages_list),
                    "items": languages_list,
                },
                "activity": {
                    "total": len(recent_activity),
                    "items": recent_activity[:10],
                },
                "streak": streak,
            }

            set_cached(cache_key, result, CACHE_TTL_SECONDS)
            return result

    except Exception as gql_err:
        print("GraphQL optimization fallback to REST due to:", gql_err)

    # -----------------------------------------------------
    # Robust REST Fallback (concurrent gather)
    # -----------------------------------------------------
    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            limits=httpx.Limits(
                max_connections=20,
                max_keepalive_connections=10,
            ),
        ) as client:
            repositories = await get_github_repositories(
                access_token,
                client=client,
            )

            (
                commits,
                pull_requests,
                issues,
                languages,
                activity,
                streak,
            ) = await asyncio.gather(
                get_github_commits(
                    access_token,
                    username,
                    repositories=repositories,
                    client=client,
                ),
                get_github_pull_requests(
                    access_token,
                    username,
                    client=client,
                ),
                get_github_issues(
                    access_token,
                    username,
                    client=client,
                ),
                get_github_languages(
                    access_token,
                    repositories=repositories,
                    client=client,
                ),
                get_github_activity(
                    access_token,
                    username,
                    client=client,
                ),
                get_github_contribution_streak(
                    access_token,
                    username,
                    client=client,
                ),
            )

        result = {
            "repositories": {
                "total": len(repositories),
            },
            "commits": {
                "total": len(commits),
            },
            "pull_requests": {
                "total": len(pull_requests),
            },
            "issues": {
                "total": len(issues),
            },
            "languages": {
                "total": len(languages),
                "items": languages,
            },
            "activity": {
                "total": len(activity),
                "items": activity[:10],
            },
            "streak": streak,
        }

        set_cached(cache_key, result, CACHE_TTL_SECONDS)
        return result
    except Exception as fallback_err:
        print("GitHub statistics REST fallback encountered error:", fallback_err)
        return {
            "repositories": {"total": 0},
            "commits": {"total": 0},
            "pull_requests": {"total": 0},
            "issues": {"total": 0},
            "languages": {"total": 0, "items": []},
            "activity": {"total": 0, "items": []},
            "streak": {"current_streak": 0, "longest_streak": 0, "total_contributions": 0},
            "error": str(fallback_err),
        }