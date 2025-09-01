# Docker Secrets Setup Script for Persona AI Link (PowerShell)
# This script creates Docker secrets for secure credential management on Windows

param(
    [switch]$Force,
    [switch]$GenerateAll
)

Write-Host "🔐 Setting up Docker Secrets for Persona AI Link" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if Docker Swarm is initialized
try {
    $swarmInfo = docker info --format "{{.Swarm.LocalNodeState}}"
    if ($swarmInfo -ne "active") {
        Write-Host "⚠️  Docker Swarm is not active. Initializing..." -ForegroundColor Yellow
        docker swarm init
        Write-Host "✅ Docker Swarm initialized" -ForegroundColor Green
    }
} catch {
    Write-Error "❌ Failed to check Docker Swarm status. Is Docker running?"
    exit 1
}

# Function to create a secret
function Create-DockerSecret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Description
    )
    
    $existingSecrets = docker secret ls --format "{{.Name}}"
    if ($existingSecrets -contains $SecretName) {
        if ($Force) {
            Write-Host "⚠️  Removing existing secret '$SecretName'..." -ForegroundColor Yellow
            docker secret rm $SecretName
        } else {
            Write-Host "⚠️  Secret '$SecretName' already exists. Use -Force to recreate." -ForegroundColor Yellow
            return
        }
    }
    
    try {
        $SecretValue | docker secret create $SecretName -
        Write-Host "✅ Created secret: $SecretName ($Description)" -ForegroundColor Green
    } catch {
        Write-Error "❌ Failed to create secret: $SecretName"
    }
}

# Function to prompt for secret value
function Get-SecretValue {
    param(
        [string]$PromptText,
        [switch]$AllowEmpty = $false
    )
    
    if ($GenerateAll) {
        return $null
    }
    
    $secureString = Read-Host "$PromptText" -AsSecureString
    $ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureString)
    try {
        $plainText = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        return $plainText
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

# Function to generate random secret
function New-RandomSecret {
    param([int]$Length = 32)
    
    $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    $random = New-Object System.Random
    $result = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $result += $chars[$random.Next($chars.Length)]
    }
    return $result
}

Write-Host ""
Write-Host "📝 Please provide values for the following secrets:" -ForegroundColor White
Write-Host "   (Press Enter to generate a random value where applicable)" -ForegroundColor Gray
Write-Host ""

# Store generated passwords for display at the end
$generatedPasswords = @{}

# Database Password
Write-Host "🗄️  Database Configuration" -ForegroundColor Blue
$dbPassword = Get-SecretValue "Database Password"
if ([string]::IsNullOrEmpty($dbPassword)) {
    $dbPassword = New-RandomSecret -Length 16
    $generatedPasswords["Database"] = $dbPassword
    Write-Host "   Generated random database password" -ForegroundColor Gray
}
Create-DockerSecret "persona_ai_db_password" $dbPassword "Database password"

Write-Host ""

# JWT Secret
Write-Host "🔑 Authentication Configuration" -ForegroundColor Blue
$jwtSecret = Get-SecretValue "JWT Secret (press Enter for random)"
if ([string]::IsNullOrEmpty($jwtSecret)) {
    $jwtSecret = New-RandomSecret -Length 64
    $generatedPasswords["JWT Secret"] = $jwtSecret
    Write-Host "   Generated random JWT secret" -ForegroundColor Gray
}
Create-DockerSecret "persona_ai_jwt_secret" $jwtSecret "JWT signing secret"

# Admin Password
$adminPassword = Get-SecretValue "Admin Password"
if ([string]::IsNullOrEmpty($adminPassword)) {
    $adminPassword = New-RandomSecret -Length 16
    $generatedPasswords["Admin"] = $adminPassword
    Write-Host "   Generated random admin password" -ForegroundColor Gray
}
Create-DockerSecret "persona_ai_admin_password" $adminPassword "Admin user password"

Write-Host ""

# LDAP Configuration
Write-Host "🏢 LDAP Configuration" -ForegroundColor Blue
$ldapPassword = Get-SecretValue "LDAP Password"
if ([string]::IsNullOrEmpty($ldapPassword)) {
    $ldapPassword = New-RandomSecret -Length 16
    $generatedPasswords["LDAP"] = $ldapPassword
    Write-Host "   Generated random LDAP password" -ForegroundColor Gray
}
Create-DockerSecret "persona_ai_ldap_password" $ldapPassword "LDAP user password"

$bindPassword = Get-SecretValue "LDAP Bind Password"
if ([string]::IsNullOrEmpty($bindPassword)) {
    $bindPassword = New-RandomSecret -Length 16
    $generatedPasswords["LDAP Bind"] = $bindPassword
    Write-Host "   Generated random bind password" -ForegroundColor Gray
}
Create-DockerSecret "persona_ai_bind_password" $bindPassword "LDAP bind password"

Write-Host ""

# Webhook Secret
Write-Host "🔗 Webhook Configuration" -ForegroundColor Blue
$webhookSecret = Get-SecretValue "Webhook Secret (press Enter for random)"
if ([string]::IsNullOrEmpty($webhookSecret)) {
    $webhookSecret = New-RandomSecret -Length 32
    $generatedPasswords["Webhook"] = $webhookSecret
    Write-Host "   Generated random webhook secret" -ForegroundColor Gray
}
Create-DockerSecret "persona_ai_webhook_secret" $webhookSecret "Webhook validation secret"

# API Key
$apiKey = Get-SecretValue "API Key (press Enter for random)"
if ([string]::IsNullOrEmpty($apiKey)) {
    $apiKey = New-RandomSecret -Length 32
    $generatedPasswords["API Key"] = $apiKey
    Write-Host "   Generated random API key" -ForegroundColor Gray
}
Create-DockerSecret "persona_ai_api_key" $apiKey "General API key"

# N8N API Key
$n8nApiKey = Get-SecretValue "N8N API Key"
if ([string]::IsNullOrEmpty($n8nApiKey)) {
    $n8nApiKey = New-RandomSecret -Length 32
    $generatedPasswords["N8N API Key"] = $n8nApiKey
    Write-Host "   Generated random N8N API key" -ForegroundColor Gray
}
Create-DockerSecret "persona_ai_n8n_api_key" $n8nApiKey "N8N integration API key"

Write-Host ""
Write-Host "✅ All secrets have been created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Created secrets:" -ForegroundColor White
docker secret ls --filter name=persona_ai

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update your application to use docker-compose.secure.yml" -ForegroundColor White
Write-Host "2. Deploy using: docker stack deploy -c docker-compose.secure.yml persona-ai" -ForegroundColor White
Write-Host "3. Verify secrets are not visible in Portainer environment variables" -ForegroundColor White

if ($generatedPasswords.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Important: Save these generated credentials securely!" -ForegroundColor Yellow
    foreach ($key in $generatedPasswords.Keys) {
        Write-Host "   $key Password: $($generatedPasswords[$key])" -ForegroundColor Yellow
    }
    
    # Save to secure file
    $credentialsFile = "persona-ai-credentials-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    $credentialsPath = Join-Path $PSScriptRoot $credentialsFile
    
    $credentialsContent = @"
Persona AI Link - Generated Credentials
Generated: $(Get-Date)
========================================

"@
    
    foreach ($key in $generatedPasswords.Keys) {
        $credentialsContent += "$key Password: $($generatedPasswords[$key])`n"
    }
    
    $credentialsContent | Out-File -FilePath $credentialsPath -Encoding UTF8
    Write-Host ""
    Write-Host "💾 Credentials saved to: $credentialsPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔐 Secrets setup completed!" -ForegroundColor Green

# Instructions for deployment
Write-Host ""
Write-Host "📖 Deployment Instructions:" -ForegroundColor Cyan
Write-Host "1. Stop current containers: docker-compose down" -ForegroundColor White
Write-Host "2. Deploy with secrets: docker stack deploy -c docker-compose.secure.yml persona-ai" -ForegroundColor White
Write-Host "3. Check deployment: docker stack services persona-ai" -ForegroundColor White
Write-Host "4. Verify in Portainer: Environment variables should not show secret values" -ForegroundColor White