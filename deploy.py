#!/usr/bin/env python3
"""Quick commit → push → wait for GitHub Pages deploy.

Usage:
  python deploy.py
  python deploy.py "Raise contact line"
  python deploy.py --no-build "Only layout tweak"
  python deploy.py --skip-watch
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGES_URL = "https://vi1wer.github.io/gen-join-to-party/"
WORKFLOW = "deploy-pages.yml"
DEFAULT_MESSAGE = "Update invitation generator"
IS_WIN = os.name == "nt"


def resolve_exe(name: str) -> str:
    """Find npm/gh/git on Windows where many CLIs are *.cmd shims."""
    found = shutil.which(name)
    if found:
        return found
    if IS_WIN:
        for ext in (".cmd", ".exe", ".bat"):
            found = shutil.which(f"{name}{ext}")
            if found:
                return found
    raise FileNotFoundError(
        f"Command not found: {name}. Open a terminal where `{name}` works, then retry."
    )


def run(cmd: list[str], *, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess[str]:
    resolved = [resolve_exe(cmd[0]), *cmd[1:]]
    print(f"> {' '.join(cmd)}")
    return subprocess.run(
        resolved,
        cwd=ROOT,
        check=check,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=capture,
        shell=IS_WIN,
    )


def git_output(*args: str) -> str:
    result = run(["git", *args], capture=True)
    return (result.stdout or "").strip()


def has_changes() -> bool:
    status = git_output("status", "--porcelain")
    return bool(status)


def latest_run_id() -> str | None:
    result = run(
        [
            "gh",
            "run",
            "list",
            f"--workflow={WORKFLOW}",
            "--limit",
            "1",
            "--json",
            "databaseId,status,displayTitle,createdAt",
        ],
        capture=True,
    )
    rows = json.loads(result.stdout or "[]")
    if not rows:
        return None
    return str(rows[0]["databaseId"])


def wait_for_new_run(prev_id: str | None, timeout_s: int = 90) -> str:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        run_id = latest_run_id()
        if run_id and run_id != prev_id:
            return run_id
        time.sleep(2)
    raise SystemExit("Timed out waiting for a new Pages workflow run.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Commit, push, and refresh GitHub Pages")
    parser.add_argument("message", nargs="?", default=DEFAULT_MESSAGE, help="Commit message")
    parser.add_argument("--no-build", action="store_true", help="Skip npm run build")
    parser.add_argument("--skip-watch", action="store_true", help="Push only, do not wait for Pages")
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="Push even if there is nothing to commit (only watch/deploy)",
    )
    args = parser.parse_args()

    branch = git_output("rev-parse", "--abbrev-ref", "HEAD")
    if branch != "main":
        print(f"Warning: current branch is '{branch}', Pages deploys from main.")

    if not args.no_build:
        run(["npm", "run", "build"])

    changed = has_changes()
    if not changed and not args.allow_empty:
        print("No local changes to commit.")
        if args.skip_watch:
            return 0
        print("Watching the latest Pages deploy anyway…")
        run_id = latest_run_id()
        if not run_id:
            print("No workflow runs found.")
            return 1
        run(["gh", "run", "watch", run_id, "--exit-status", "--interval", "5"])
        print(f"Pages: {PAGES_URL}")
        return 0

    prev_run = latest_run_id() if not args.skip_watch else None

    if changed:
        run(["git", "add", "-A"])
        # Keep local scratch / bytecode out of the release
        run(
            ["git", "reset", "HEAD", "--", "test.html", "__pycache__", "*.pyc"],
            check=False,
        )
        staged = git_output("diff", "--cached", "--name-only")
        if not staged:
            print("Nothing staged after excluding scratch files.")
            if not args.allow_empty:
                return 0
        else:
            run(["git", "commit", "-m", args.message])

    run(["git", "push", "-u", "origin", "HEAD"])

    if args.skip_watch:
        print(f"Pushed. Pages will update soon: {PAGES_URL}")
        return 0

    print("Waiting for GitHub Pages workflow…")
    run_id = wait_for_new_run(prev_run)
    print(f"Watching run {run_id}")
    run(["gh", "run", "watch", run_id, "--exit-status", "--interval", "5"])
    print(f"Done. Pages updated: {PAGES_URL}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"Command failed with exit code {exc.returncode}", file=sys.stderr)
        raise SystemExit(exc.returncode) from exc
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        raise SystemExit(130) from None
