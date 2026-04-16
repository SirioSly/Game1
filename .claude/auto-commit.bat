@echo off
cd /d "D:\Projetos CLAUDE\Game1"
git add -A
git diff --cached --quiet
if %errorlevel% neq 0 (
    git commit -m "chore: auto-commit"
    git push origin main
)
