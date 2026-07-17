import { writeFile } from "node:fs/promises";

const githubUser = "nishant-giri-j";
const leetcodeUser = "girinb";
const hackerrankUser = "girinb";
const githubHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function summarizeGithubEvent(event) {
  const repo = event.repo?.name?.replace(`${githubUser}/`, "") || "a repository";
  const payload = event.payload || {};
  const summaries = {
    PushEvent: `Pushed ${payload.size || 0} commit${payload.size === 1 ? "" : "s"} to ${repo}`,
    PullRequestEvent: `${payload.action || "Updated"} pull request in ${repo}`,
    CreateEvent: `Created ${payload.ref_type || "repository"} in ${repo}`,
    IssuesEvent: `${payload.action || "Updated"} issue in ${repo}`,
    WatchEvent: `Starred ${repo}`,
    ForkEvent: `Forked ${repo}`,
  };
  return { type: (event.type || "Update").replace("Event", "").toUpperCase(), description: summaries[event.type] || `Updated ${repo}`, createdAt: event.created_at };
}

async function githubActivity() {
  const [profile, events, repos] = await Promise.all([
    fetchJson(`https://api.github.com/users/${githubUser}`, { headers: githubHeaders }),
    fetchJson(`https://api.github.com/users/${githubUser}/events/public?per_page=12`, { headers: githubHeaders }),
    fetchJson(`https://api.github.com/users/${githubUser}/repos?sort=updated&per_page=100`, { headers: githubHeaders }),
  ]);

  const repositories = repos
    .filter((repo) => !repo.fork)
    .map((repo) => ({
      name: repo.name,
      description: repo.description || "",
      url: repo.html_url,
      topics: repo.topics || [],
      language: repo.language,
      stargazers_count: repo.stargazers_count,
    }));

  return {
    username: githubUser,
    publicRepos: profile.public_repos,
    followers: profile.followers,
    updatedAt: profile.updated_at,
    recentEvents: events.filter((event) => ["PushEvent", "PullRequestEvent", "CreateEvent", "IssuesEvent", "WatchEvent", "ForkEvent"].includes(event.type)).map(summarizeGithubEvent),
    repositories: repositories,
  };
}

async function leetcodeActivity() {
  const query = `query userPublicProfile($username: String!) { matchedUser(username: $username) { submitStatsGlobal { acSubmissionNum { difficulty count } } } }`;
  const payload = await fetchJson("https://leetcode.com/graphql/", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "portfolio-activity-sync" },
    body: JSON.stringify({ query, variables: { username: leetcodeUser } }),
  });
  const stats = payload.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
  const counts = Object.fromEntries(stats.map((item) => [item.difficulty, item.count]));
  return { username: leetcodeUser, solved: counts.All ?? null, easy: counts.Easy ?? null, medium: counts.Medium ?? null, hard: counts.Hard ?? null };
}

async function hackerRankActivity() {
  // HackerRank does not guarantee a public, versioned stats API. This endpoint is
  // intentionally best-effort: profile links remain correct even when it changes.
  const payload = await fetchJson(`https://www.hackerrank.com/rest/contests/master/hackers/${hackerrankUser}/profile`, { headers: { "user-agent": "portfolio-activity-sync" } });
  const profile = payload.model || payload;
  const badges = Array.isArray(profile.badges) ? profile.badges.length : null;
  return {
    username: hackerrankUser,
    primaryStat: badges ? `${badges} badges` : "Profile",
    label: badges ? "coding badges earned" : "open coding profile",
  };
}

async function attempt(label, operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    console.warn(`[activity-sync] ${label} failed: ${error.message}`);
    return fallback;
  }
}

const github = await attempt("GitHub", githubActivity, { username: githubUser, publicRepos: 12, followers: 1, recentEvents: [], repositories: [] });
const leetcode = await attempt("LeetCode", leetcodeActivity, { username: leetcodeUser, solved: null, easy: null, medium: null, hard: null });
const hackerrank = await attempt("HackerRank", hackerRankActivity, { username: hackerrankUser, primaryStat: "Profile", label: "open coding profile" });
const output = { updatedAt: new Date().toISOString(), github, leetcode, hackerrank };

await writeFile(new URL("../data/activity.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.log("[activity-sync] data/activity.json updated");

