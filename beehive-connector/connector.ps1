param(
  [Parameter(Mandatory=$true)][string]$WorkerUrl,
  [Parameter(Mandatory=$true)][string]$Token
)
$ErrorActionPreference = 'Stop'
$base = $WorkerUrl.TrimEnd('/') + '/api/cortes'
$headers = @{ 'X-BeeHive-Connector-Token' = $Token }
$yt = if ($env:YTDLP_PATH) { $env:YTDLP_PATH } else { 'yt-dlp' }
$browser = if ($env:YTDLP_BROWSER) { $env:YTDLP_BROWSER } else { 'edge' }
$root = Join-Path $env:TEMP 'beehive-connector'; New-Item -ItemType Directory -Force -Path $root | Out-Null
Write-Host 'BeeHive Connector ativo. Deixe esta janela aberta.'
while ($true) {
  try {
    $job = Invoke-RestMethod -Uri ($base + '/connector/jobs/next') -Method Post -Headers $headers
    if ($job) {
      $dir = Join-Path $root $job.jobId; New-Item -ItemType Directory -Force -Path $dir | Out-Null
      $out = Join-Path $dir 'source.%(ext)s'
      Invoke-RestMethod -Uri ($base + '/connector/jobs/' + $job.jobId + '/progress') -Method Post -Headers $headers -Body (@{ progress = 12; message = 'Baixando vídeo no computador autenticado' } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
      & $yt --cookies-from-browser $browser --no-playlist -f 'best[height<=1080]/best' --merge-output-format mp4 -o $out $job.url
      if ($LASTEXITCODE -ne 0) { throw 'Falha no download do YouTube. Feche o Chrome e tente novamente.' }
      $file = Get-ChildItem $dir -File | Where-Object { $_.Extension -in '.mp4','.mkv','.webm','.mov' } | Select-Object -First 1
      if (-not $file) { throw 'Vídeo baixado não encontrado.' }
      $uploadHeaders = @{ 'X-File-Name' = $file.Name; 'Content-Type' = 'video/mp4' }
      $stored = Invoke-RestMethod -Uri ($base + '/upload') -Method Post -Headers $uploadHeaders -InFile $file.FullName -ContentType 'video/mp4'
      Invoke-RestMethod -Uri ($base + '/projects/' + $job.projectId) -Method Patch -Headers $headers -Body (@{ sourceVideoUrl = $stored.sourceUrl } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
      Invoke-RestMethod -Uri ($base + '/generate') -Method Post -Headers $headers -Body (@{ projectId = $job.projectId; executionMode = 'cloud' } | ConvertTo-Json) -ContentType 'application/json' | Out-Null
      Remove-Item -LiteralPath $dir -Recurse -Force
      Write-Host ('Tarefa enviada ao BeeHive: ' + $job.projectId)
    }
  } catch { Write-Warning $_.Exception.Message }
  Start-Sleep -Seconds 8
}
