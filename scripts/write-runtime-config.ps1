param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('local', 'staging', 'production')]
    [string]$Environment,

    [string]$OutputPath = 'dist/runtime-config.js'
)

$root = Split-Path -Parent $PSScriptRoot

$envFile = switch ($Environment) {
    'local' { Join-Path $root '.env.local' }
    'staging' { Join-Path $root '.env.staging' }
    'production' { Join-Path $root '.env.production' }
}

if (-not (Test-Path $envFile)) {
    throw "Env file not found: $envFile"
}

$vars = @{}
Get-Content -Path $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) {
        return
    }

    $parts = $line.Split('=', 2)
    if ($parts.Count -ne 2) {
        return
    }

    $vars[$parts[0].Trim()] = $parts[1].Trim()
}

$apiBaseUrl = $vars['VITE_API_BASE_URL']
$functionsBaseUrl = if ($vars.ContainsKey('VITE_FUNCTIONS_BASE_URL') -and $vars['VITE_FUNCTIONS_BASE_URL']) {
    $vars['VITE_FUNCTIONS_BASE_URL']
} else {
    $apiBaseUrl
}

$wsBaseUrl = if ($vars.ContainsKey('VITE_WS_BASE_URL') -and $vars['VITE_WS_BASE_URL']) {
    $vars['VITE_WS_BASE_URL']
} elseif ($apiBaseUrl -like 'https://*') {
    'wss://' + $apiBaseUrl.Substring(8)
} elseif ($apiBaseUrl -like 'http://*') {
    'ws://' + $apiBaseUrl.Substring(7)
} else {
    $apiBaseUrl
}

$config = [ordered]@{
    apiBaseUrl = $apiBaseUrl
    functionsBaseUrl = $functionsBaseUrl
    wsBaseUrl = $wsBaseUrl
    firebase = [ordered]@{
        apiKey = $vars['VITE_FIREBASE_API_KEY']
        authDomain = $vars['VITE_FIREBASE_AUTH_DOMAIN']
        projectId = $vars['VITE_FIREBASE_PROJECT_ID']
        storageBucket = $vars['VITE_FIREBASE_STORAGE_BUCKET']
        messagingSenderId = $vars['VITE_FIREBASE_MESSAGING_SENDER_ID']
        appId = $vars['VITE_FIREBASE_APP_ID']
    }
}

$json = $config | ConvertTo-Json -Depth 4
$outputFile = if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $root $OutputPath }
$outputDir = Split-Path -Parent $outputFile

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$content = @(
    'window.__APP_CONFIG__ = ' + $json + ';',
    ''
)

Set-Content -Path $outputFile -Value $content -Encoding UTF8
Write-Host "Runtime config written to $outputFile for environment $Environment"
