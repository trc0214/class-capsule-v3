$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$configDir = Join-Path $repoRoot "config"
$outputPath = Join-Path $configDir "local-config.js"

if (-not (Test-Path $envPath)) {
  throw ".env not found at $envPath. Copy .env.example to .env first."
}

if (-not (Test-Path $configDir)) {
  New-Item -ItemType Directory -Path $configDir | Out-Null
}

$pairs = @{}
foreach ($line in Get-Content $envPath) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith("#")) {
    continue
  }

  $separatorIndex = $trimmed.IndexOf("=")
  if ($separatorIndex -lt 1) {
    continue
  }

  $key = $trimmed.Substring(0, $separatorIndex).Trim()
  $value = $trimmed.Substring($separatorIndex + 1).Trim()

  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  $pairs[$key] = $value
}

function Escape-JsString([string]$value) {
  if ($null -eq $value) {
    return ""
  }

  return $value.Replace("\", "\\").Replace('"', '\"')
}

$recognitionLanguages = @()
if ($pairs.ContainsKey("RECOGNITION_LANGUAGES")) {
  $recognitionLanguages = $pairs["RECOGNITION_LANGUAGES"].Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

$segmentInterval = 3
if ($pairs.ContainsKey("SEGMENT_INTERVAL_MINUTES")) {
  $parsed = 0
  if ([int]::TryParse($pairs["SEGMENT_INTERVAL_MINUTES"], [ref]$parsed)) {
    $segmentInterval = $parsed
  }
}

$recognitionLanguagesJson = if ($recognitionLanguages.Count -gt 0) {
  "[" + (($recognitionLanguages | ForEach-Object { '"' + (Escape-JsString $_) + '"' }) -join ", ") + "]"
} else {
  "[]"
}

$content = @"
window.LECTURE_ASSISTANT_LOCAL_CONFIG = {
  azureKey: "$(Escape-JsString $pairs["AZURE_SPEECH_KEY"])",
  azureRegion: "$(Escape-JsString $pairs["AZURE_SPEECH_REGION"])",
  geminiKey: "$(Escape-JsString $pairs["GEMINI_API_KEY"])",
  interfaceLanguage: "$(Escape-JsString $pairs["INTERFACE_LANGUAGE"])",
  recognitionLanguages: $recognitionLanguagesJson,
  segmentIntervalMinutes: $segmentInterval
};
"@

Set-Content -Path $outputPath -Value $content -Encoding UTF8
Write-Host "Generated $outputPath"