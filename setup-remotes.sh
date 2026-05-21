#!/bin/bash
# Configure remotes for both GitHub and GitVerse
# Usage: bash setup-remotes.sh

echo "Setting up remotes..."

# Remove existing origin if present
git remote remove origin 2>/dev/null
git remote remove gitverse 2>/dev/null

# Add GitHub as origin (fetch)
git remote add origin git@github.com:dupleymi-aup/test-trainer.git

# Add GitVerse as separate remote (fetch)
git remote add gitverse git@gitverse.ru:dupleymi-amp/test-trainer.git

# Configure origin to push to BOTH repositories
git remote set-url origin --add --push git@github.com:dupleymi-aup/test-trainer.git
git remote set-url origin --add --push git@gitverse.ru:dupleymi-amp/test-trainer.git

echo "Remotes configured:"
git remote -v
echo ""
echo "Now 'git push' will push to both GitHub and GitVerse."
