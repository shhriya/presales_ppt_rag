param()
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host "Starting PPT Bot Backend Server..." -ForegroundColor Green

if (-not (Test-Path ".venv\Scripts\python.exe")) {
  Write-Host "❌ .venv not found. Create it and install deps:" -ForegroundColor Red
  Write-Host "    python -m venv .venv" -ForegroundColor Yellow
  Write-Host "    .venv\Scripts\python.exe -m pip install -r backend\requirements.txt" -ForegroundColor Yellow
  exit 1
}

# Load backend/.env if present
$envPath = Join-Path $PSScriptRoot "backend\.env"
if (Test-Path $envPath) {
  Write-Host "Loading environment from $envPath" -ForegroundColor Cyan
  Get-Content $envPath | ForEach-Object {
    if ($_ -match "^\s*#") { return }
    if (-not $_) { return }
    $kv = $_ -split "=",2
    if ($kv.Length -eq 2) {
      $key = $kv[0].Trim()
      $val = $kv[1].Trim()
      [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
      Set-Item -Path Env:$key -Value $val | Out-Null
    }
  }
}

# Ensure deps (idempotent)
& .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt | Out-Host

Write-Host "Starting server on http://127.0.0.1:9000 ..." -ForegroundColor Green
& .\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 9000 --host 127.0.0.1
