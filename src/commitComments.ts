import { Octokit } from "@octokit/core";
import { Repo, Branch, Params } from "./types";

type Commit = {
  commitSHA: string;
};

type CommentTag = {
  commentTag: string;
};

type CommentBody = {
  commentBody: string;
};

type CommentId = {
  commentId: number;
};

export class TaggedCommitComments {
  private readonly repo: Repo;
  private readonly octokit: Octokit;
  private readonly headers: any;

  constructor(repo: Repo, octokit: Octokit, headers: any) {
    this.repo = repo;
    this.octokit = octokit;
    this.headers = headers;
  }

  static formatCommentMessage(
    messageTemplate: string,
    branch: Branch,
    config: Pick<
      Params,
      "daysBeforeBranchStale" | "daysBeforeBranchDelete"
    >,
    repo: Repo,
    username: string
  ) {
    const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
    return messageTemplate
      .replace(/[{]branchName[}]/g, branch.branchName)
      .replace(
        /[{]branchUrl[}]/g,
        `${serverUrl}/${encodeURIComponent(repo.owner)}/${encodeURIComponent(
          repo.repo
        )}/tree/${encodeURIComponent(branch.branchName)}`
      )
      .replace(/[{]repoOwner[}]/g, repo.owner)
      .replace(/[{]repoName[}]/g, repo.repo)
      .replace(/[{]author[}]/g, username)
      .replace(
        /[{]daysBeforeBranchStale[}]/g,
        String(config.daysBeforeBranchStale)
      )
      .replace(
        /[{]daysBeforeBranchDelete[}]/g,
        String(config.daysBeforeBranchDelete)
      );
  }

  async getCommitCommentsWithTag({
    commentTag,
    commitSHA,
  }: Commit & CommentTag) {
    console.log(
      `[getCommitCommentsWithTag] Fetching comments for commit ${commitSHA} with tag [${commentTag}]`
    );

    const messages = (
      await this.octokit.request(
        "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments",
        {
          headers: this.headers,
          ...this.repo,
          commit_sha: commitSHA,
        }
      )
    ).data;

    const filtered = messages.filter((comment) =>
      comment.body.startsWith("[" + commentTag + "]")
    );

    console.log(
      `[getCommitCommentsWithTag] Found ${messages.length} total comments, ${filtered.length} with tag [${commentTag}]`
    );

    return filtered;
  }

  async addCommitComments({
    commentTag,
    commentBody,
    commitSHA,
  }: Commit & CommentTag & CommentBody) {
    const body = `[${commentTag}]\r\n\r\n${commentBody}`;

    console.log(`[addCommitComments] 🏷️  Adding comment to commit ${commitSHA}`);
    console.log(`[addCommitComments]   Tag: [${commentTag}]`);
    console.log(
      `[addCommitComments]   Repo: ${this.repo.owner}/${this.repo.repo}`
    );
    console.log(
      `[addCommitComments]   Comment preview: ${commentBody.substring(
        0,
        100
      )}...`
    );

    await this.octokit.request(
      "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
      {
        headers: this.headers,
        ...this.repo,
        commit_sha: commitSHA,
        body,
      }
    );

    console.log(`[addCommitComments] ✅ Comment added successfully`);
  }

  async deleteCommitComments({ commentId }: CommentId) {
    console.log(`[deleteCommitComments] 🗑️  Deleting comment ID: ${commentId}`);

    const result = await this.octokit.request(
      "DELETE /repos/{owner}/{repo}/comments/{comment_id}",
      {
        headers: this.headers,
        ...this.repo,
        comment_id: commentId,
      }
    );

    console.log(`[deleteCommitComments] ✅ Comment deleted successfully`);
    return result;
  }

  async getBranch(branch: Branch) {
    const ref = branch.prefix.replace(/^refs\//, "") + branch.branchName;
    console.log(`[getBranch] Fetching branch info for ref: ${ref}`);

    return this.octokit.request("GET /repos/{owner}/{repo}/git/refs/{ref}", {
      headers: this.headers,
      ...this.repo,
      ref,
    });
  }

  async deleteBranch(branch: Branch) {
    const ref = branch.prefix.replace(/^refs\//, "") + branch.branchName;

    console.log(`[deleteBranch] 🔥 DELETING BRANCH: ${branch.branchName}`);
    console.log(`[deleteBranch]   Ref: ${ref}`);
    console.log(`[deleteBranch]   Repo: ${this.repo.owner}/${this.repo.repo}`);
    console.log(`[deleteBranch]   IsProtected: ${branch.isProtected}`);
    console.log(`[deleteBranch]   CommitID: ${branch.commitId}`);

    const result = await this.octokit.request(
      "DELETE /repos/{owner}/{repo}/git/refs/{ref}",
      {
        headers: this.headers,
        ...this.repo,
        ref,
      }
    );

    console.log(`[deleteBranch] ✅ Branch deleted successfully`);
    return result;
  }

  async getProtectedBranches() {
    console.log(
      `[getProtectedBranches] Fetching protected branches for ${this.repo.owner}/${this.repo.repo}`
    );

    const { data } = await this.octokit.request(
      "GET /repos/{owner}/{repo}/branches?protected=true",
      {
        headers: this.headers,
        ...this.repo,
      }
    );

    console.log(
      `[getProtectedBranches] Found ${data.length} protected branches:`,
      data.map((b: { name: string }) => b.name)
    );
    return data;
  }
}
