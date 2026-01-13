#!/usr/bin/env python3
"""
Implement Skill for Conductor - Ralph Wiggum on a diet

Simple autonomous iteration:
- Task defined with checkboxes
- Progress lives in files + git
- Rotate context when needed (with overlap protection)
"""
import os
import sys
import re
import json
from datetime import datetime

CONDUCTOR_DIR = "conductor"
STATE_DIR = os.path.join(CONDUCTOR_DIR, ".implement")
TASK_FILE = os.path.join(STATE_DIR, "TASK.md")
PROGRESS_FILE = os.path.join(STATE_DIR, "progress.md")
OVERLAP_FILE = os.path.join(STATE_DIR, "overlap.md")
STATE_FILE = os.path.join(STATE_DIR, "state.json")

# Keep last N progress entries as overlap during rotation
OVERLAP_ENTRIES = 5

def ensure_state_dir():
    os.makedirs(STATE_DIR, exist_ok=True)

def init_task(content: str = ""):
    """Initialize with task content"""
    ensure_state_dir()
    if content:
        with open(TASK_FILE, 'w') as f:
            f.write(content)
    print(f"Task initialized: {TASK_FILE}")

def get_context() -> str:
    """Get prompt context (task + overlap + progress)"""
    parts = []
    if os.path.exists(TASK_FILE):
        with open(TASK_FILE, 'r') as f:
            parts.append(f.read())
    if os.path.exists(OVERLAP_FILE):
        with open(OVERLAP_FILE, 'r') as f:
            overlap = f.read().strip()
            if overlap:
                parts.append(f"\n## Recent Context (from previous rotation)\n{overlap}")
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            parts.append(f"\n## Current Progress\n{f.read()}")
    return "\n".join(parts)

def get_pending() -> list:
    """Get unchecked checkboxes"""
    if not os.path.exists(TASK_FILE):
        return []
    with open(TASK_FILE, 'r') as f:
        content = f.read()
    return re.findall(r'^[\s]*(?:[-\d]+\.?)\s*\[\s*\]\s*(.+)$', content, re.MULTILINE)

def update_progress(msg: str):
    """Append to progress file"""
    ensure_state_dir()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(PROGRESS_FILE, 'a') as f:
        f.write(f"\n[{timestamp}] {msg}\n")

def is_complete() -> bool:
    """Check if all checkboxes done"""
    return len(get_pending()) == 0

def rotate():
    """Rotate context: archive progress, keep overlap, continue fresh"""
    if not os.path.exists(PROGRESS_FILE):
        return False

    with open(PROGRESS_FILE, 'r') as f:
        progress = f.read()

    # Extract last N entries as overlap
    entries = progress.split("## ")[-OVERLAP_ENTRIES:]
    overlap_content = "## ".join(entries).strip()

    # Save overlap
    with open(OVERLAP_FILE, 'w') as f:
        f.write(overlap_content)

    # Clear progress file (fresh start)
    with open(PROGRESS_FILE, 'w') as f:
        f.write("")

    # Log rotation
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(os.path.join(STATE_DIR, "rotations.log"), 'a') as f:
        f.write(f"[{timestamp}] Context rotated (kept {OVERLAP_ENTRIES} entries overlap)\n")

    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: skill.py <cmd> [args]")
        print("Commands: init, context, pending, progress <msg>, complete, rotate")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "init":
        if len(sys.argv) > 2:
            with open(sys.argv[2]) as f:
                init_task(f.read())
        elif not sys.stdin.isatty():
            init_task(sys.stdin.read())
        else:
            init_task()

    elif cmd == "context":
        print(get_context())

    elif cmd == "pending":
        items = get_pending()
        for i, item in enumerate(items, 1):
            print(f"{i}. [ ] {item}")

    elif cmd == "complete":
        sys.exit(0 if is_complete() else 1)

    elif cmd == "progress":
        if len(sys.argv) > 2:
            update_progress(" ".join(sys.argv[2:]))

    elif cmd == "rotate":
        if rotate():
            print("Rotated: last 5 progress entries preserved as overlap")
        else:
            print("Nothing to rotate")

if __name__ == "__main__":
    main()
