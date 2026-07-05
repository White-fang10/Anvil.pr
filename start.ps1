# start.ps1
# Startup script for Anvil.pr (Backend & Frontend)

Write-Host "Starting Anvil.pr Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd backend; if (!(Test-Path .env)) { Write-Host 'WARNING: .env file not found in backend. Copying .env.example to .env' -ForegroundColor Yellow; Copy-Item .env.example .env }; Write-Host 'Checking database...' -ForegroundColor Cyan; python seed.py; uvicorn main:app --reload`""

Write-Host "Starting Anvil.pr Frontend..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit -Command `"cd frontend; if (!(Test-Path node_modules)) { Write-Host 'Installing dependencies...' -ForegroundColor Yellow; npm install }; npm run dev`""

Write-Host "Both services are starting in separate windows!" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8000"
Write-Host "Frontend App: http://localhost:3000"
