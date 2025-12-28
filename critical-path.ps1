# UTF-8 with BOM
# Critical Path Diagram Generator for Jira Epics

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$TicketId,

    [Parameter(Mandatory=$false)]
    [string]$CloudId = "f123d63c-0668-447b-8d3b-36ef86d5d01a",

    [Parameter(Mandatory=$false)]
    [string]$EnvFile = ".env"
)

# Set console encoding to UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Function to load .env file
function Get-EnvVariables {
    param([string]$EnvFilePath)

    $envVars = @{}

    # Check in current directory first
    if (Test-Path $EnvFilePath) {
        $fullPath = $EnvFilePath
    }
    # Check in script directory
    elseif (Test-Path (Join-Path $PSScriptRoot $EnvFilePath)) {
        $fullPath = Join-Path $PSScriptRoot $EnvFilePath
    }
    else {
        return $envVars
    }

    Get-Content $fullPath -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        # Skip empty lines and comments
        if ($line -and -not $line.StartsWith('#')) {
            if ($line -match '^([^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                $value = $value -replace '^["'']|["'']$', ''
                $envVars[$key] = $value
            }
        }
    }

    return $envVars
}

# Load environment variables from .env file
$envVars = Get-EnvVariables -EnvFilePath $EnvFile

# Get credentials from .env or environment variables
$AtlassianEmail = if ($envVars['ATLASSIAN_EMAIL']) { $envVars['ATLASSIAN_EMAIL'] } else { $env:ATLASSIAN_EMAIL }
$AtlassianToken = if ($envVars['ATLASSIAN_API_TOKEN']) { $envVars['ATLASSIAN_API_TOKEN'] } else { $env:ATLASSIAN_API_TOKEN }
$CloudId = if ($envVars['ATLASSIAN_CLOUD_ID']) { $envVars['ATLASSIAN_CLOUD_ID'] } else { $CloudId }

# Color codes for output
$colors = @{
    Done = "Green"
    InProgress = "Yellow"
    Todo = "Blue"
    Blocked = "Red"
    Header = "Cyan"
    Analysis = "Magenta"
}

# Status symbols - using ASCII for reliability
$statusSymbol = @{
    "Done" = "[DONE]"
    "In Progress" = "[>>>>]"
    "To Do" = "[TODO]"
    "Blocked" = "[BLCK]"
}

function Get-JiraAuthHeader {
    if (-not $AtlassianEmail -or -not $AtlassianToken) {
        Write-Host "Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set" -ForegroundColor Red
        Write-Host ""
        Write-Host "Create a .env file with:" -ForegroundColor Yellow
        Write-Host '  ATLASSIAN_EMAIL=your-email@example.com' -ForegroundColor Gray
        Write-Host '  ATLASSIAN_API_TOKEN=your-api-token' -ForegroundColor Gray
        Write-Host ""
        Write-Host "Get your API token from: https://id.atlassian.com/manage-profile/security/api-tokens" -ForegroundColor Cyan
        exit 1
    }

    $base64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${AtlassianEmail}:${AtlassianToken}"))
    return @{
        "Authorization" = "Basic $base64"
        "Content-Type" = "application/json"
    }
}

function Get-JiraIssue {
    param([string]$IssueKey)

    $headers = Get-JiraAuthHeader
    $url = "https://api.atlassian.com/ex/jira/$CloudId/rest/api/3/issue/$IssueKey"

    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
        return $response
    } catch {
        Write-Host "Error fetching issue ${IssueKey}: $_" -ForegroundColor Red
        exit 1
    }
}

function Search-JiraIssues {
    param([string]$Jql)

    $headers = Get-JiraAuthHeader

    # Use new search/jql endpoint
    $jqlEncoded = [System.Uri]::EscapeDataString($Jql)
    $url = "https://api.atlassian.com/ex/jira/$CloudId/rest/api/3/search/jql?jql=$jqlEncoded&fields=key,summary,status,description&maxResults=100"

    try {
        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get

        # Check if response has values or issues
        if ($response.values) {
            return $response.values
        } elseif ($response.issues) {
            return $response.issues
        } else {
            Write-Host "Debug: Response structure: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Gray
            return @()
        }
    } catch {
        Write-Host "Error searching issues: $_" -ForegroundColor Red
        Write-Host "URL: $url" -ForegroundColor Gray
        Write-Host "JQL: $Jql" -ForegroundColor Gray
        exit 1
    }
}

function Get-StatusInfo {
    param([string]$Status)

    $symbol = "[????]"
    $color = "White"

    if ($Status -eq "Done") {
        $symbol = $statusSymbol["Done"]
        $color = $colors.Done
    }
    elseif ($Status -eq "In Progress") {
        $symbol = $statusSymbol["In Progress"]
        $color = $colors.InProgress
    }
    elseif ($Status -eq "To Do") {
        $symbol = $statusSymbol["To Do"]
        $color = $colors.Todo
    }

    return @{
        Symbol = $symbol
        Color = $color
        Name = $Status
    }
}

function Show-CriticalPathDiagram {
    param(
        [object]$Epic,
        [array]$Stories
    )

    $doubleLineTop = "=" * 65
    $singleLine = "-" * 65

    # Header
    Write-Host ""
    Write-Host $doubleLineTop -ForegroundColor $colors.Header
    Write-Host "  $($Epic.key): $($Epic.fields.summary)" -ForegroundColor $colors.Header

    $completed = ($Stories | Where-Object { $_.fields.status.name -eq "Done" }).Count
    $total = $Stories.Count
    $percentage = if ($total -gt 0) { [math]::Round(($completed / $total) * 100) } else { 0 }

    Write-Host "  Status: $completed/$total Complete ($percentage%)" -ForegroundColor $colors.Header
    Write-Host $doubleLineTop -ForegroundColor $colors.Header
    Write-Host ""

    # Group stories by status
    $doneStories = $Stories | Where-Object { $_.fields.status.name -eq "Done" }
    $inProgressStories = $Stories | Where-Object { $_.fields.status.name -eq "In Progress" }
    $todoStories = $Stories | Where-Object { $_.fields.status.name -eq "To Do" }

    # Show stories grouped
    if ($doneStories) {
        Write-Host $singleLine -ForegroundColor Green
        Write-Host " COMPLETED STORIES" -ForegroundColor Green
        Write-Host $singleLine -ForegroundColor Green
        Write-Host ""
        foreach ($story in $doneStories) {
            $info = Get-StatusInfo -Status $story.fields.status.name
            Write-Host "  $($info.Symbol) $($story.key): $($story.fields.summary)" -ForegroundColor $info.Color
        }
        Write-Host ""
    }

    if ($inProgressStories) {
        Write-Host $singleLine -ForegroundColor Yellow
        Write-Host " IN PROGRESS" -ForegroundColor Yellow
        Write-Host $singleLine -ForegroundColor Yellow
        Write-Host ""
        foreach ($story in $inProgressStories) {
            $info = Get-StatusInfo -Status $story.fields.status.name
            Write-Host "  $($info.Symbol) $($story.key): $($story.fields.summary)" -ForegroundColor $info.Color
        }
        Write-Host ""
    }

    if ($todoStories) {
        Write-Host $singleLine -ForegroundColor Blue
        Write-Host " TO DO" -ForegroundColor Blue
        Write-Host $singleLine -ForegroundColor Blue
        Write-Host ""
        foreach ($story in $todoStories) {
            $info = Get-StatusInfo -Status $story.fields.status.name
            Write-Host "  $($info.Symbol) $($story.key): $($story.fields.summary)" -ForegroundColor $info.Color
        }
        Write-Host ""
    }

    # Analysis section
    Write-Host $doubleLineTop -ForegroundColor $colors.Analysis
    Write-Host ""
    Write-Host "ANALYSIS:" -ForegroundColor $colors.Analysis
    $inProgressCount = ($inProgressStories | Measure-Object).Count
    $todoCount = ($todoStories | Measure-Object).Count
    Write-Host "  * Completed: $completed / $total stories ($percentage%)" -ForegroundColor White
    Write-Host "  * In Progress: $inProgressCount stories" -ForegroundColor White
    Write-Host "  * To Do: $todoCount stories" -ForegroundColor White
    Write-Host ""

    # Next steps
    if ($inProgressStories) {
        Write-Host "CURRENT FOCUS:" -ForegroundColor $colors.Analysis
        foreach ($story in $inProgressStories) {
            Write-Host "  * $($story.key): $($story.fields.summary)" -ForegroundColor Yellow
        }
        Write-Host ""
    }

    if ($todoStories) {
        Write-Host "NEXT STEPS:" -ForegroundColor $colors.Analysis
        $nextStories = $todoStories | Select-Object -First 3
        $counter = 1
        foreach ($story in $nextStories) {
            Write-Host "  $counter. $($story.key): $($story.fields.summary)" -ForegroundColor White
            $counter++
        }
        Write-Host ""
    }
}

# Main execution
Write-Host ""
Write-Host "Fetching Jira epic $TicketId..." -ForegroundColor Cyan

# Fetch the epic
$epic = Get-JiraIssue -IssueKey $TicketId

if ($epic.fields.issuetype.name -ne "Epic") {
    Write-Host "Warning: $TicketId is not an Epic (type: $($epic.fields.issuetype.name))" -ForegroundColor Yellow
    Write-Host "Showing issue details instead..." -ForegroundColor Yellow
    Write-Host ""

    $info = Get-StatusInfo -Status $epic.fields.status.name
    Write-Host "$($info.Symbol) $($epic.key): $($epic.fields.summary)" -ForegroundColor $info.Color
    Write-Host "Status: $($epic.fields.status.name)" -ForegroundColor $info.Color
    exit 0
}

# Fetch child stories
Write-Host "Fetching child stories..." -ForegroundColor Cyan
$jql = "parent = $TicketId ORDER BY key ASC"
$stories = Search-JiraIssues -Jql $jql

if ($stories.Count -eq 0) {
    Write-Host "No child stories found for epic $TicketId" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($stories.Count) stories" -ForegroundColor Green

# Show the diagram
Show-CriticalPathDiagram -Epic $epic -Stories $stories

Write-Host ""
