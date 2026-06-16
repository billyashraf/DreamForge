import { NextResponse } from "next/server";

const REPO = "billyashraf/DreamForge";

export const revalidate = 60; // cache for 60s to avoid GitHub rate limits

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "DreamForge-App",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/commits?per_page=40`,
      { headers, next: { revalidate: 60 } }
    );

    if (!res.ok) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        return NextResponse.json({ error: "GitHub API rate limit reached. Set GITHUB_TOKEN in .env.local to increase it." }, { status: 429 });
      }
      return NextResponse.json({ error: `GitHub API error: ${res.status}` }, { status: res.status });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = await res.json();

    const commits = raw.map((c) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split("\n")[0],
      body: c.commit.message.split("\n").slice(2).join("\n").trim() || null,
      author: c.commit.author?.name ?? "Unknown",
      date: c.commit.author?.date ?? null,
      url: c.html_url,
    }));

    const contributors = [...new Set(commits.map((c) => c.author))];

    return NextResponse.json({ commits, repo: REPO, contributors, total: commits.length });
  } catch {
    return NextResponse.json({ error: "Failed to reach GitHub." }, { status: 500 });
  }
}
