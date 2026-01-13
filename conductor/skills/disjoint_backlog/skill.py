#!/usr/bin/env python3
import os
import sys
import json
import glob
import hashlib
from datetime import datetime

# Configuration
CONDUCTOR_DIR = "conductor"
TRACKS_DIR = os.path.join(CONDUCTOR_DIR, "tracks")
TOKEN_FILE = os.path.join(CONDUCTOR_DIR, "DISJOINT_TOKEN.lock")

def examine_boilerplate(path):
    """
    Examines a directory for 'boilerplate' patterns indicating an untouched phase.
    """
    print(f"Examing {path} for boilerplate...")
    boilerplate_indicators = [
        "TODO", "FIXME", "[ ]", "REPLACE_ME", "boilerplate"
    ]
    
    findings = []
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith(".md") or file.endswith(".ts") or file.endswith(".tsx"):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                        for indicator in boilerplate_indicators:
                            if indicator in content:
                                findings.append({
                                    "file": filepath,
                                    "indicator": indicator
                                })
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
    return findings

def occupy_token():
    """
    Occupies the 'token' by creating a lock file.
    """
    if os.path.exists(TOKEN_FILE):
        print("Token is already occupied! Disjoint backlog is active.")
        return False
    
    with open(TOKEN_FILE, 'w') as f:
        json.dump({
            "occupied_by": "disjoint_backlog",
            "timestamp": datetime.now().isoformat()
        }, f)
    print("Token occupied successfully.")
    return True

def freeze_adjacent_backlog():
    """
    Lists other tracks and virtually 'freezes' them by logging their state.
    """
    print("Freezing adjacent backlog...")
    tracks = glob.glob(os.path.join(TRACKS_DIR, "*"))
    frozen_state = {}
    
    for track in tracks:
        if "disjoint_backlog" in track:
            continue
        
        track_name = os.path.basename(track)
        plan_file = os.path.join(track, "plan.md")
        
        if os.path.exists(plan_file):
            with open(plan_file, 'r') as f:
                # Simple hash of Plan to detect changes
                content = f.read()
                frozen_state[track_name] = hashlib.md5(content.encode()).hexdigest()
                
    print(f"Frozen state of {len(frozen_state)} adjacent tracks.")
    return frozen_state

def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "scan"
    
    if command == "occupy":
        if occupy_token():
            freeze_adjacent_backlog()
            
    elif command == "scan":
        # Look for potential "untouched phases" - for now scanning tracks dir
        findings = examine_boilerplate(TRACKS_DIR)
        print(f"Found {len(findings)} boilerplate items.")
        for f in findings[:5]:
            print(f"  - {f['indicator']} in {f['file']}")
            
    else:
        print("Unknown command")

if __name__ == "__main__":
    main()
