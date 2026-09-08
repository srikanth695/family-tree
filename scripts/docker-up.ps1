# Free local app ports, then start Docker Compose.
# Never kill Docker Desktop / WSL relay processes — they may briefly hold 3000/3001.
$ErrorActionPreference = "Continue"
$ports = @(3000, 3001)
$skipNames = @(
  "com.docker.backend",
  "Docker Desktop",
  "docker",
  "dockerd",
  "wslrelay",
  "wsl",
  "vpnkit",
  "com.docker.service"
)

Write-Host "Checking for local app processes on ports 3000 and 3001..."
foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $conns) {
    $procId = $conn.OwningProcess
    if (-not $procId -or $procId -eq 0) { continue }
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    $name = if ($proc) { $proc.ProcessName } else { "" }
    if ($skipNames -contains $name) {
      Write-Host "Skipping Docker/WSL PID $procId ($name) on port $port"
      continue
    }
    Write-Host "Stopping PID $procId ($name) on port $port"
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Waiting for Docker engine..."
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  docker info 1>$null 2>$null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  Write-Error "Docker engine is not ready. Open Docker Desktop and wait until it says Running, then retry."
  exit 1
}

Write-Host "Starting Docker Compose..."
docker compose up --build @args
