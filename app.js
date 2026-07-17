const selectors = {
  repoCount: document.querySelector("#repo-count"),
  githubMain: document.querySelector("#github-main-stat"),
  githubFollowers: document.querySelector("#github-followers"),
  githubUpdated: document.querySelector("#github-updated"),
  leetcodeMain: document.querySelector("#leetcode-main-stat"),
  leetcodeEasy: document.querySelector("#leetcode-easy"),
  leetcodeMedium: document.querySelector("#leetcode-medium"),
  leetcodeHard: document.querySelector("#leetcode-hard"),
  hackerrankMain: document.querySelector("#hackerrank-main-stat"),
  hackerrankLabel: document.querySelector("#hackerrank-label"),
  eventList: document.querySelector("#event-list"),
  syncStatus: document.querySelector("#sync-status"),
  activityUpdated: document.querySelector("#activity-updated"),
};

const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

function setText(element, value) {
  if (element && value !== undefined && value !== null && value !== "") element.textContent = value;
}

function relativeTime(isoDate) {
  if (!isoDate) return "Live profile";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(isoDate).getTime()) / 1000));
  if (seconds < 120) return "Updated just now";
  const units = [[31536000, "y"], [2592000, "mo"], [86400, "d"], [3600, "h"], [60, "m"]];
  const [size, suffix] = units.find(([size]) => seconds >= size) || [1, "s"];
  return `Updated ${Math.floor(seconds / size)}${suffix} ago`;
}

function renderEvents(events) {
  if (!events?.length) return;
  selectors.eventList.replaceChildren(...events.slice(0, 5).map((event) => {
    const item = document.createElement("li");
    const type = document.createElement("span");
    const description = document.createElement("span");
    const time = document.createElement("time");
    type.className = "event-type";
    type.textContent = event.type || "UPDATE";
    description.textContent = event.description || "New public activity";
    time.textContent = event.createdAt ? formatter.format(new Date(event.createdAt)).toUpperCase() : "RECENT";
    item.append(type, description, time);
    return item;
  }));
}

function renderProjects(repos) {
  const grid = document.querySelector("#github-projects-grid");
  if (!grid || !repos || !repos.length) return;
  
  grid.replaceChildren(...repos.map((repo) => {
    const article = document.createElement("article");
    article.className = "project-card glass-card reveal is-visible";
    
    const h3 = document.createElement("h3");
    h3.className = "futuristic-text";
    h3.textContent = repo.name;
    
    const p = document.createElement("p");
    p.textContent = repo.description || "No description provided.";
    
    const tagRow = document.createElement("div");
    tagRow.className = "tag-row";
    
    // Add language if available
    if (repo.language) {
      const langSpan = document.createElement("span");
      langSpan.textContent = repo.language;
      langSpan.style.fontWeight = "600";
      tagRow.appendChild(langSpan);
    }
    
    // Add topics
    repo.topics.forEach(topic => {
      const topicSpan = document.createElement("span");
      topicSpan.textContent = topic;
      tagRow.appendChild(topicSpan);
    });
    
    const link = document.createElement("a");
    link.className = "project-link";
    link.href = repo.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "View Repository";
    
    article.append(h3, p, tagRow, link);
    return article;
  }));
}

function applyActivity(data) {
  const github = data.github || {};
  const leetcode = data.leetcode || {};
  const hackerrank = data.hackerrank || {};

  setText(selectors.repoCount, github.publicRepos);
  setText(selectors.githubMain, github.publicRepos);
  setText(selectors.githubFollowers, `${github.followers ?? 0} follower${github.followers === 1 ? "" : "s"}`);
  setText(selectors.githubUpdated, relativeTime(github.updatedAt));
  setText(selectors.leetcodeMain, leetcode.solved);
  setText(selectors.leetcodeEasy, leetcode.easy);
  setText(selectors.leetcodeMedium, leetcode.medium);
  setText(selectors.leetcodeHard, leetcode.hard);
  setText(selectors.hackerrankMain, hackerrank.primaryStat);
  setText(selectors.hackerrankLabel, hackerrank.label);
  renderEvents(github.recentEvents);
  if (github.repositories) {
    renderProjects(github.repositories);
  }

  const updated = data.updatedAt ? `Last sync: ${formatter.format(new Date(data.updatedAt))}` : "Awaiting first sync";
  setText(selectors.activityUpdated, updated);
  setText(selectors.syncStatus, data.updatedAt ? "Public activity synced" : "Syncing public activity");
}

async function loadActivity() {
  try {
    const response = await fetch("data/activity.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not fetch activity data");
    applyActivity(await response.json());
  } catch (error) {
    console.info("Activity data remains in its static fallback state.", error);
    setText(selectors.syncStatus, "Public profile links available");
  }
}

function setupReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  elements.forEach((element) => observer.observe(element));
}

function setupCursorGlow() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  window.addEventListener("pointermove", (event) => {
    document.documentElement.style.setProperty("--mouse-x", `${event.clientX - 192}px`);
    document.documentElement.style.setProperty("--mouse-y", `${event.clientY - 192}px`);
  }, { passive: true });
}

document.querySelector("#year").textContent = new Date().getFullYear();
setupReveal();
setupCursorGlow();
loadActivity();

