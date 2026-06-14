$root = "C:\Users\Priyanka\Desktop\Miniproject\Gap2Grow"

& "$root\stop-dev.ps1"

# Frontend: install deps if needed then start
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; if (-not (Test-Path 'node_modules')) { npm install }; npm run dev"

# Node backend: install deps if needed then start
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend-nodejs'; if (-not (Test-Path 'node_modules')) { npm install }; npm run dev"

# Python backend: create venv and install requirements if needed then start
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; if (-not (Test-Path '.venv')) { python -m venv .venv }; . .\.venv\Scripts\Activate.ps1; if (-not (Get-Command pip -ErrorAction SilentlyContinue)) { $env:PATH = '.\.venv\Scripts;' + $env:PATH }; if ((Test-Path requirements.txt) -and -not ((Get-ChildItem .venv | Measure-Object).Count)) { pip install -r requirements.txt }; uvicorn main:app --reload --port 8000"