#!/bin/bash
# scripts/track_external.sh
# Tracks the external 'fullstack' branch from lastrust-svg remote

REMOTE="lastrust-svg"
BRANCH="fullstack"
LOCAL_TRACKING="deploy/external-fullstack"

echo "Fetching updates from $REMOTE..."
git fetch $REMOTE

# Check if local tracking branch exists
if ! git show-ref --verify --quiet refs/heads/$LOCAL_TRACKING; then
    echo "Creating local tracking branch $LOCAL_TRACKING..."
    git branch --track $LOCAL_TRACKING $REMOTE/$BRANCH
fi

# Compare HEADs
LOCAL_SHA=$(git rev-parse $LOCAL_TRACKING)
REMOTE_SHA=$(git rev-parse $REMOTE/$BRANCH)

if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
    echo "Updates detected on $REMOTE/$BRANCH!"
    echo "Local: $LOCAL_SHA"
    echo "Remote: $REMOTE_SHA"
    echo ""
    echo "Commits to sync:"
    git log $LOCAL_TRACKING..$REMOTE/$BRANCH --oneline
    
    echo ""
    read -p "Do you want to pull these changes now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout $LOCAL_TRACKING
        git merge $REMOTE/$BRANCH
        echo "Merged."
    fi
else
    echo "Branch is up to date."
fi
