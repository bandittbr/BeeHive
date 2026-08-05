param(
  [Parameter(Mandatory=$true)][string]$Url,
  [Parameter(Mandatory=$true)][string]$WorkerUrl,
  [Parameter(Mandatory=$true)][string]$Token
)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:TEMP 'beehive-connector'
New-Item -ItemType Directory -Force -Path $root | Out-Null
$out = Join-Path $root 'source.%(ext)s'
$yt = if ($env:YTDLP_PATH) { $env:YTDLP_PATH } else { 'yt-dlp' }
& $yt --cookies-from-browser chrome --no-playlist -f 'best[height<=1080]/best' --merge-output-format mp4 -o $out $Url
if ($LASTEXITCODE -ne 0) { throw 'Falha ao baixar o vídeo. Verifique se o Chrome está fechado e logado no YouTube.' }
$file = Get-ChildItem $root -File | Where-Object { $_.Extension -in '.mp4','.mkv','.webm','.mov' } | Select-Object -First 1
if (-not $file) { throw 'Vídeo baixado não encontrado.' }
$headers = @{ 'X-File-Name' = $file.Name; 'Content-Type' = 'video/mp4' }
$endpoint = ($WorkerUrl.TrimEnd('/') + '/api/cortes/upload')
Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -InFile $file.FullName -ContentType 'video/mp4'
Remove-Item -LiteralPath $file.FullName -Force
Write-Host 'Vídeo enviado ao BeeHive. Continue pelo formulário de geração no painel.'
