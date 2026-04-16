@echo off
cd /d "D:\Projetos CLAUDE\Game1"
git add src/ .claude/settings.local.json .claude/auto-commit.bat .gitignore
git diff --cached --quiet
if %errorlevel% neq 0 (
    git commit -m "chore: auto-commit"
    git push origin main
)
