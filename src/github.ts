import { Octokit } from "@octokit/rest";

export interface PRFile {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PRDetails {
  owner: string;
  repo: string;
  number: number;
  title: string;
  files: PRFile[];
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getPRDetails(owner: string, repo: string, prNumber: number): Promise<PRDetails> {
    const [prResponse, filesResponse] = await Promise.all([
      this.octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      }),
      this.octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
      }),
    ]);

    const files: PRFile[] = filesResponse.data.map((file) => ({
      filename: file.filename,
      status: file.status as PRFile["status"],
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
    }));

    return {
      owner,
      repo,
      number: prNumber,
      title: prResponse.data.title,
      files,
    };
  }

  async getFileContent(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      if ("content" in response.data && response.data.type === "file") {
        return Buffer.from(response.data.content, "base64").toString("utf-8");
      }
      return null;
    } catch {
      return null;
    }
  }
}

export function parsePRUrl(url: string): { owner: string; repo: string; number: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;

  const [, owner, repo, numberStr] = match;
  if (!owner || !repo || !numberStr) return null;

  return { owner, repo, number: parseInt(numberStr, 10) };
}
