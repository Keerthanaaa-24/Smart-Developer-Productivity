import asyncio
from datetime import datetime, timedelta

import httpx


GITHUB_API_BASE = "https://api.github.com"
GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

REQUEST_TIMEOUT = httpx.Timeout(
    connect=10.0,
    read=30.0,
    write=30.0,
    pool=10.0,
)

MAX_RETRIES = 3
MAX_REPOSITORIES_FOR_DETAILS = 30


# =========================================================
# HEADERS
# =========================================================

def github_headers(access_token: str):
    return {
        **GITHUB_HEADERS,
        "Authorization": f"Bearer {access_token}",
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

        if len(data) < 100:
            break

        page += 1

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
    if repositories is None:

        repositories = (
            await get_github_repositories(
                access_token,
                client=client,
            )
        )

    commits = []

    repositories = repositories[
        :MAX_REPOSITORIES_FOR_DETAILS
    ]

    for repo in repositories:

        owner = repo.get(
            "owner",
            {},
        ).get("login")

        repo_name = repo.get("name")

        if not owner or not repo_name:
            continue

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

            for commit in repo_commits:

                commit_info = commit.get(
                    "commit",
                    {},
                )

                author = commit_info.get(
                    "author",
                    {},
                )

                commits.append({
                    "sha":
                        commit.get("sha"),

                    "repository":
                        repo_name,

                    "repository_url":
                        repo.get("html_url"),

                    "message":
                        commit_info.get(
                            "message"
                        ),

                    "author":
                        author.get("name"),

                    "date":
                        author.get("date"),

                    "url":
                        commit.get("html_url"),
                })

        except Exception as error:

            print(
                f"Commit error for "
                f"{repo_name}: {error}"
            )

            continue

    commits.sort(
        key=lambda x: x.get("date") or "",
        reverse=True,
    )

    return commits[:50]


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

    # Keep requests sequential to avoid
    # overwhelming GitHub.

    for repo in repositories:

        owner = repo.get(
            "owner",
            {},
        ).get("login")

        repo_name = repo.get("name")

        if not owner or not repo_name:
            continue

        try:

            languages = await github_get(
                access_token,
                f"/repos/{owner}/{repo_name}/languages",
                client=client,
            )

            for (
                language,
                bytes_count,
            ) in languages.items():

                language_totals[language] = (
                    language_totals.get(
                        language,
                        0,
                    )
                    + bytes_count
                )

        except Exception as error:

            print(
                f"Language error for "
                f"{repo_name}: {error}"
            )

            continue

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
# CONTRIBUTION CALENDAR
# =========================================================

async def get_github_contribution_calendar(
    access_token: str,
    username: str,
    client: httpx.AsyncClient | None = None,
):
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

    data = await github_graphql(
        access_token,
        query,
        {
            "login": username,
        },
        client=client,
    )

    user = data.get("user")

    if not user:
        return {
            "total_contributions": 0,
            "days": [],
        }

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

    for week in calendar.get(
        "weeks",
        [],
    ):

        for day in week.get(
            "contributionDays",
            [],
        ):

            days.append({
                "date":
                    day.get("date"),

                "count":
                    day.get(
                        "contributionCount",
                        0,
                    ),
            })

    days.sort(
        key=lambda x: x["date"]
    )

    return {
        "total_contributions":
            calendar.get(
                "totalContributions",
                0,
            ),

        "days":
            days,
    }


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
    calendar = (
        await get_github_contribution_calendar(
            access_token,
            username,
            client=client,
        )
    )

    total_contributions = calendar[
        "total_contributions"
    ]

    days = calendar["days"]

    longest_streak = 0
    current_longest = 0
    previous_date = None

    for day in days:

        date = datetime.strptime(
            day["date"],
            "%Y-%m-%d",
        ).date()

        count = day["count"]

        if count > 0:

            if (
                previous_date
                and date
                == previous_date
                + timedelta(days=1)
            ):
                current_longest += 1

            else:
                current_longest = 1

            longest_streak = max(
                longest_streak,
                current_longest,
            )

        else:

            current_longest = 0

        previous_date = date

    current_streak = 0

    today = datetime.utcnow().date()

    contribution_dates = {
        datetime.strptime(
            day["date"],
            "%Y-%m-%d",
        ).date()
        for day in days
        if day["count"] > 0
    }

    check_date = today

    if check_date not in contribution_dates:

        yesterday = (
            check_date -
            timedelta(days=1)
        )

        if yesterday in contribution_dates:
            check_date = yesterday
        else:
            check_date = None

    if check_date:

        while check_date in contribution_dates:

            current_streak += 1

            check_date = (
                check_date -
                timedelta(days=1)
            )

    return {
        "current_streak":
            current_streak,

        "longest_streak":
            longest_streak,

        "total_contributions":
            total_contributions,
    }


# =========================================================
# GITHUB STATISTICS
# =========================================================

async def get_github_statistics(
    access_token: str,
    username: str,
):
    """
    Fetch GitHub analytics using one shared
    HTTP client and one repository fetch.

    This avoids repeatedly creating clients
    and repeatedly downloading repositories.
    """

    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT,
        limits=httpx.Limits(
            max_connections=10,
            max_keepalive_connections=5,
        ),
    ) as client:

        # -------------------------------------------------
        # Fetch repositories ONCE
        # -------------------------------------------------

        repositories = (
            await get_github_repositories(
                access_token,
                client=client,
            )
        )

        # -------------------------------------------------
        # Fetch independent data sequentially.
        # This is intentional to prevent GitHub from
        # receiving a burst of requests.
        # -------------------------------------------------

        commits = await get_github_commits(
            access_token,
            username,
            repositories=repositories,
            client=client,
        )

        pull_requests = (
            await get_github_pull_requests(
                access_token,
                username,
                client=client,
            )
        )

        issues = await get_github_issues(
            access_token,
            username,
            client=client,
        )

        languages = await get_github_languages(
            access_token,
            repositories=repositories,
            client=client,
        )

        activity = await get_github_activity(
            access_token,
            username,
            client=client,
        )

        streak = (
            await get_github_contribution_streak(
                access_token,
                username,
                client=client,
            )
        )

    return {
        "repositories": {
            "total":
                len(repositories),
        },

        "commits": {
            "total":
                len(commits),
        },

        "pull_requests": {
            "total":
                len(pull_requests),
        },

        "issues": {
            "total":
                len(issues),
        },

        "languages": {
            "total":
                len(languages),

            "items":
                languages,
        },

        "activity": {
            "total":
                len(activity),

            "items":
                activity[:10],
        },

        "streak": streak,
    }