$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $repoPath '.venv/Scripts/python.exe'
$logPath = Join-Path $repoPath 'evidence'
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
Push-Location (Join-Path $repoPath 'server')
try {
    & $pythonPath manage.py migrate --noinput
    if ($LASTEXITCODE -ne 0) { throw 'Django migration failed' }
    & $pythonPath manage.py seed_cars
    if ($LASTEXITCODE -ne 0) { throw 'Car fixture import failed' }
    & $pythonPath manage.py collectstatic --noinput
    if ($LASTEXITCODE -ne 0) { throw 'Static asset collection failed' }
} finally { Pop-Location }
& $pythonPath (Join-Path $PSScriptRoot 'setup_local.py')
$env:EMBEDDED_MONGO = '1'
$dealerProcess = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList 'app.js' -WorkingDirectory (Join-Path $repoPath 'server/database') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'dealers.log') -RedirectStandardError (Join-Path $logPath 'dealers-error.log') -PassThru
$sentimentProcess = Start-Process -FilePath $pythonPath -ArgumentList 'app.py' -WorkingDirectory (Join-Path $repoPath 'server/djangoapp/microservices') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'sentiment.log') -RedirectStandardError (Join-Path $logPath 'sentiment-error.log') -PassThru
$webProcess = Start-Process -FilePath $pythonPath -ArgumentList '-u','manage.py','runserver','127.0.0.1:8000','--noreload' -WorkingDirectory (Join-Path $repoPath 'server') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'django_server.txt') -RedirectStandardError (Join-Path $logPath 'django-error.log') -PassThru
@{dealer=$dealerProcess.Id; sentiment=$sentimentProcess.Id; web=$webProcess.Id} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logPath 'local-processes.json')
Write-Output 'Started local services; check evidence logs for readiness. App: http://127.0.0.1:8000'
