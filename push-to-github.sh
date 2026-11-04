#!/usr/bin/env bash
# Pushes this folder to YOUR GitHub repository. Run it inside the kiro-platform folder.
# Mac/Linux: bash push-to-github.sh      Windows: use "Git Bash", or double-click push-to-github.bat
set -e
cd "$(dirname "$0")"
command -v git >/dev/null 2>&1 || { echo "Git is not installed. Get it from https://git-scm.com/downloads then run this again."; exit 1; }
echo "1) On GitHub click New repository, give it a name, leave 'Add a README' UNticked, click Create."
echo "2) Copy the address it shows, like https://github.com/yourname/kiro-platform.git"
printf "Paste the repository address here: "; read -r URL
case "$URL" in https://github.com/*|git@github.com:*) ;; *) echo "That does not look like a GitHub address. Nothing was changed."; exit 1;; esac
[ -d .git ] || git init -b main
git add -A
git diff --cached --quiet || git commit -m "KIRO platform" 
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "$URL"
echo "Pushing... GitHub may ask you to sign in. If it asks for a password, paste a personal access token (GitHub > Settings > Developer settings > Personal access tokens)."
git push -u origin main
echo "Done. Open $URL in your browser."
