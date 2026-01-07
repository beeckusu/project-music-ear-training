# Bead Status - Show epic's child tickets and dependency chart
# Usage: .\bead-status.ps1 voy
# Or:    .\bead-status.ps1 meta-voy

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$EpicTag
)

# Set console encoding to UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Color configuration
$colors = @{
    Ready = "Green"
    Blocked = "Red"
    InProgress = "Yellow"
    Done = "Gray"
    Epic = "Cyan"
    External = "Magenta"
    Header = "White"
}

function Get-BeadsIssues {
    $output = bd list --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error running 'bd list': $output" -ForegroundColor Red
        exit 1
    }
    # Filter to get only the JSON part (skip warning boxes)
    $jsonStart = $output | Select-String -Pattern '^\[' | Select-Object -First 1 -ExpandProperty LineNumber
    if ($jsonStart) {
        $jsonLines = $output | Select-Object -Skip ($jsonStart - 1)
        return $jsonLines | ConvertFrom-Json
    }
    return $output | ConvertFrom-Json
}

function Get-BeadsReady {
    $output = bd ready --json --limit 1000 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error running 'bd ready': $output" -ForegroundColor Red
        exit 1
    }
    # Filter to get only the JSON part (skip warning boxes)
    $jsonStart = $output | Select-String -Pattern '^\[' | Select-Object -First 1 -ExpandProperty LineNumber
    if ($jsonStart) {
        $jsonLines = $output | Select-Object -Skip ($jsonStart - 1)
        return $jsonLines | ConvertFrom-Json
    }
    return $output | ConvertFrom-Json
}

function Find-Epic {
    param([string]$Tag, [array]$AllIssues)

    # Try exact match first
    $epic = $AllIssues | Where-Object { $_.id -eq $Tag -and $_.issue_type -eq "epic" }
    if ($epic) { return $epic }

    # Try case-insensitive match
    $epic = $AllIssues | Where-Object { $_.id -eq $Tag.ToLower() -and $_.issue_type -eq "epic" }
    if ($epic) { return $epic }

    # Try with meta- prefix
    $metaTag = if ($Tag -notmatch '^meta-') { "meta-$Tag" } else { $Tag }
    $epic = $AllIssues | Where-Object { $_.id -eq $metaTag -and $_.issue_type -eq "epic" }
    if ($epic) { return $epic }

    # Try to find by META tag in labels or title
    $epic = $AllIssues | Where-Object {
        $_.issue_type -eq "epic" -and
        ($_.title -match $Tag -or ($_.labels -and $_.labels -contains $Tag))
    }
    if ($epic) { return $epic }

    return $null
}

function Get-EpicChildren {
    param([string]$EpicId, [array]$AllIssues)

    # Children have IDs that start with the epic ID followed by a dot
    # e.g., epic "meta-voy" has children "meta-voy.1", "meta-voy.2", etc.
    $children = $AllIssues | Where-Object {
        $_.id -like "$EpicId.*"
    }

    # Also check labels for cross-references
    $labeledChildren = $AllIssues | Where-Object {
        $_.labels -and $_.labels -contains $EpicId
    }

    # Combine both results and remove duplicates
    $allChildren = @($children) + @($labeledChildren) | Sort-Object -Property id -Unique

    return $allChildren
}

function Get-IssueDependencies {
    param([string]$IssueId)

    $output = bd show $IssueId --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        return @{
            blocks = @()
            blocked_by = @()
        }
    }

    # Convert output to string array if it isn't already
    $lines = @($output -split "`n")

    # Find the first line that starts with [ or {
    $jsonStartIdx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s*[\[\{]') {
            $jsonStartIdx = $i
            break
        }
    }

    if ($jsonStartIdx -ge 0) {
        # Join lines from JSON start to end
        $jsonText = ($lines[$jsonStartIdx..($lines.Count - 1)] -join "`n").Trim()
        try {
            $result = $jsonText | ConvertFrom-Json
            # bd show returns an array with one element
            if ($result -is [Array] -and $result.Count -gt 0) {
                $issue = $result[0]
            } else {
                $issue = $result
            }
        } catch {
            # JSON parsing failed
            return @{
                blocks = @()
                blocked_by = @()
            }
        }
    } else {
        # No JSON found
        return @{
            blocks = @()
            blocked_by = @()
        }
    }

    # Parse the dependencies array
    $blocks = @()
    $blocked_by = @()

    if ($issue.dependencies) {
        foreach ($dep in $issue.dependencies) {
            # Skip parent-child relationships (epic relationships)
            if ($dep.dependency_type -eq "parent-child") {
                continue
            }

            # If dependency_type is "blocks", it means this dependency blocks the current issue
            # So the dependency ID goes in blocked_by
            if ($dep.dependency_type -eq "blocks") {
                $blocked_by += $dep.id
            }
            # If dependency_type is "blocked-by", it means current issue blocks this dependency
            # So the dependency ID goes in blocks
            elseif ($dep.dependency_type -eq "blocked-by") {
                $blocks += $dep.id
            }
        }
    }

    # Also parse the dependents array
    if ($issue.dependents) {
        foreach ($dep in $issue.dependents) {
            # Skip parent-child relationships (epic relationships)
            if ($dep.dependency_type -eq "parent-child") {
                continue
            }

            # If dependency_type is "blocks", it means the current issue blocks this dependent
            # So the dependent ID goes in blocks
            if ($dep.dependency_type -eq "blocks") {
                $blocks += $dep.id
            }
            # If dependency_type is "blocked-by", it means this dependent blocks the current issue
            # So the dependent ID goes in blocked_by
            elseif ($dep.dependency_type -eq "blocked-by") {
                $blocked_by += $dep.id
            }
        }
    }

    return @{
        blocks = $blocks
        blocked_by = $blocked_by
    }
}

function Get-TaskStatus {
    param([object]$Task, [array]$ReadyIds, [array]$BlockedByIds = @())

    switch ($Task.status) {
        "done" { return @{ Symbol = "[DONE]"; Color = $colors.Done } }
        "closed" { return @{ Symbol = "[DONE]"; Color = $colors.Done } }
        "in_progress" { return @{ Symbol = "[PROG]"; Color = $colors.InProgress } }
        default {
            # If task has no blockers (within epic), it should be ready
            if ($BlockedByIds.Count -eq 0) {
                return @{ Symbol = "[READY]"; Color = $colors.Ready }
            }
            # Otherwise check bd ready list
            elseif ($ReadyIds -contains $Task.id) {
                return @{ Symbol = "[READY]"; Color = $colors.Ready }
            } else {
                return @{ Symbol = "[BLOCK]"; Color = $colors.Blocked }
            }
        }
    }
}

function Show-EpicStatus {
    param(
        [object]$Epic,
        [array]$Children,
        [array]$ReadyIssues,
        [array]$AllIssues
    )

    $doubleLine = "=" * 80
    $singleLine = "-" * 80

    # Header
    Write-Host ""
    Write-Host $doubleLine -ForegroundColor $colors.Epic
    Write-Host "  EPIC: $($Epic.id) - $($Epic.title)" -ForegroundColor $colors.Epic
    Write-Host $doubleLine -ForegroundColor $colors.Epic
    Write-Host ""

    # Epic Stats
    $total = $Children.Count
    $done = ($Children | Where-Object { $_.status -eq "done" -or $_.status -eq "closed" }).Count
    $inProgress = ($Children | Where-Object { $_.status -eq "in_progress" }).Count
    $open = ($Children | Where-Object { $_.status -eq "open" }).Count
    $percentage = if ($total -gt 0) { [math]::Round(($done / $total) * 100) } else { 0 }
    $percentDisplay = "$percentage%"

    Write-Host "  Total Tasks: $total" -ForegroundColor White
    Write-Host "  [DONE] Done: $done ($percentDisplay)" -ForegroundColor $colors.Done
    Write-Host "  [PROG] In Progress: $inProgress" -ForegroundColor $colors.InProgress
    Write-Host "  [OPEN] Open: $open" -ForegroundColor White
    Write-Host ""

    # Build dependency info
    $readyIds = $ReadyIssues | ForEach-Object { $_.id }
    $childIds = $Children | ForEach-Object { $_.id }

    # Collect all dependencies
    $allDeps = @{}
    foreach ($child in $Children) {
        $deps = Get-IssueDependencies -IssueId $child.id
        $allDeps[$child.id] = @{
            task = $child
            blocks = $deps.blocks
            blocked_by = $deps.blocked_by
        }
    }

    # Find external dependencies (dependencies on tickets outside the epic)
    $externalDeps = @{}
    foreach ($childId in $allDeps.Keys) {
        $deps = $allDeps[$childId]
        foreach ($blockerId in $deps.blocked_by) {
            if ($childIds -notcontains $blockerId) {
                if (-not $externalDeps.ContainsKey($blockerId)) {
                    $externalTask = $AllIssues | Where-Object { $_.id -eq $blockerId }
                    $externalDeps[$blockerId] = $externalTask
                }
            }
        }
    }

    # Show child tickets with dependencies
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host " CHILD TICKETS" -ForegroundColor $colors.Header
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host ""

    foreach ($child in $Children | Sort-Object id) {
        $deps = $allDeps[$child.id]
        $childIdFormatted = $child.id

        # Calculate internal blockers for status determination
        $internalBlockers = @($deps.blocked_by | Where-Object { $childIds -contains $_ })
        $status = Get-TaskStatus -Task $child -ReadyIds $readyIds -BlockedByIds $internalBlockers

        Write-Host "  $($status.Symbol) ${childIdFormatted}" -ForegroundColor $status.Color -NoNewline
        Write-Host ": $($child.title)" -ForegroundColor White

        # Show what blocks this task
        if ($deps.blocked_by.Count -gt 0) {
            $externalBlockers = @($deps.blocked_by | Where-Object { $childIds -notcontains $_ })

            if ($internalBlockers.Count -gt 0) {
                Write-Host "      |-- Blocked by: $($internalBlockers -join ', ')" -ForegroundColor Gray
            }
            if ($externalBlockers.Count -gt 0) {
                Write-Host "      |-- Blocked by (external): " -NoNewline -ForegroundColor $colors.External
                Write-Host "$($externalBlockers -join ', ')" -ForegroundColor $colors.External
            }
        }

        # Show what this task blocks
        if ($deps.blocks.Count -gt 0) {
            $internalBlocks = @($deps.blocks | Where-Object { $childIds -contains $_ })
            $externalBlocks = @($deps.blocks | Where-Object { $childIds -notcontains $_ })

            if ($internalBlocks.Count -gt 0) {
                Write-Host "      \`-- Blocks: $($internalBlocks -join ', ')" -ForegroundColor Gray
            }
            if ($externalBlocks.Count -gt 0) {
                Write-Host "      \`-- Blocks (external): $($externalBlocks -join ', ')" -ForegroundColor Gray
            }
        }

        Write-Host ""
    }

    # Show external dependencies section
    if ($externalDeps.Count -gt 0) {
        Write-Host $singleLine -ForegroundColor $colors.External
        Write-Host " EXTERNAL DEPENDENCIES" -ForegroundColor $colors.External
        Write-Host $singleLine -ForegroundColor $colors.External
        Write-Host ""
        Write-Host "  Tasks from other epics that block this epic's tickets:" -ForegroundColor Gray
        Write-Host ""

        foreach ($externalId in $externalDeps.Keys | Sort-Object) {
            $externalTask = $externalDeps[$externalId]
            if ($externalTask) {
                $status = Get-TaskStatus -Task $externalTask -ReadyIds $readyIds
                $externalIdFormatted = $externalTask.id
                Write-Host "  $($status.Symbol) ${externalIdFormatted}" -ForegroundColor $status.Color -NoNewline
                Write-Host ": $($externalTask.title)" -ForegroundColor White

                # Show which tickets in this epic depend on this external task
                $dependentTickets = @()
                foreach ($childId in $allDeps.Keys) {
                    if ($allDeps[$childId].blocked_by -contains $externalId) {
                        $dependentTickets += $childId
                    }
                }
                if ($dependentTickets.Count -gt 0) {
                    Write-Host "      \`-- Blocks in this epic: $($dependentTickets -join ', ')" -ForegroundColor Gray
                }
            } else {
                Write-Host "  [MISS] ${externalId}: (not found in beads)" -ForegroundColor Gray
            }
            Write-Host ""
        }
    }

    # Show dependency diagram
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host " DEPENDENCY DIAGRAM" -ForegroundColor $colors.Header
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host ""

    # First, show external dependencies if any
    if ($externalDeps.Count -gt 0) {
        Write-Host "  External Dependencies (from other epics):" -ForegroundColor $colors.External
        Write-Host ""

        foreach ($externalId in $externalDeps.Keys | Sort-Object) {
            $externalTask = $externalDeps[$externalId]
            if ($externalTask) {
                $status = Get-TaskStatus -Task $externalTask -ReadyIds $readyIds

                # Find which tasks in this epic depend on this external task
                $dependentTickets = @()
                foreach ($childId in $allDeps.Keys) {
                    if ($allDeps[$childId].blocked_by -contains $externalId) {
                        $dependentTickets += $childId
                    }
                }

                Write-Host "      +-------------------+" -ForegroundColor $colors.External
                Write-Host "      | $($status.Symbol)          |" -ForegroundColor $colors.External
                Write-Host "      | $externalId" -ForegroundColor $colors.External -NoNewline
                Write-Host (" " * (18 - $externalId.Length)) -NoNewline
                Write-Host "|" -ForegroundColor $colors.External

                $title = $externalTask.title
                if ($title.Length -gt 17) { $title = $title.Substring(0, 14) + "..." }
                Write-Host "      | $($title.PadRight(17)) |" -ForegroundColor White
                Write-Host "      +-------------------+" -ForegroundColor $colors.External

                # Draw arrows to dependent tasks
                foreach ($depId in $dependentTickets) {
                    Write-Host "              |" -ForegroundColor Gray
                    Write-Host "              v (blocks $depId)" -ForegroundColor Gray
                }
                Write-Host ""
            }
        }
        Write-Host ""
    }

    # Group tasks by dependency level
    $levels = @{}
    $processed = @{}
    $level = 0

    # Level 0: Tasks with no blockers from this epic
    $levels[$level] = @()
    foreach ($childId in $allDeps.Keys) {
        $deps = $allDeps[$childId]
        $internalBlockers = @($deps.blocked_by | Where-Object { $childIds -contains $_ })

        if ($internalBlockers.Count -eq 0) {
            $levels[$level] += $childId
            $processed[$childId] = $true
        }
    }

    # Build subsequent levels
    $maxLevels = 20
    while ($level -lt $maxLevels) {
        $level++
        $levels[$level] = @()

        foreach ($childId in $allDeps.Keys) {
            if ($processed[$childId]) { continue }

            $deps = $allDeps[$childId]
            $internalBlockers = @($deps.blocked_by | Where-Object { $childIds -contains $_ })

            # Check if all internal blockers are processed
            $allBlockersProcessed = $true
            foreach ($blockerId in $internalBlockers) {
                if (-not $processed[$blockerId]) {
                    $allBlockersProcessed = $false
                    break
                }
            }

            if ($allBlockersProcessed -and $internalBlockers.Count -gt 0) {
                $levels[$level] += $childId
                $processed[$childId] = $true
            }
        }

        # Stop if no more tasks at this level
        if ($levels[$level].Count -eq 0) {
            break
        }
    }

    # Display dependency relationships
    Write-Host "  Dependency Relationships:" -ForegroundColor $colors.Header
    Write-Host ""
    Write-Host "  Legend: --> blocks    <-- blocked by" -ForegroundColor Gray
    Write-Host ""

    # Show each task with its direct dependencies
    foreach ($childId in $Children | Sort-Object id | ForEach-Object { $_.id }) {
        $task = $allDeps[$childId].task
        $deps = $allDeps[$childId]

        $internalBlockers = @($deps.blocked_by | Where-Object { $childIds -contains $_ })
        $status = Get-TaskStatus -Task $task -ReadyIds $readyIds -BlockedByIds $internalBlockers
        $externalBlockers = @($deps.blocked_by | Where-Object { $childIds -notcontains $_ })
        $internalBlocks = @($deps.blocks | Where-Object { $childIds -contains $_ })

        # Show the task box
        Write-Host "  +------------------------+" -ForegroundColor $status.Color
        Write-Host "  | $($status.Symbol)               |" -ForegroundColor $status.Color
        Write-Host "  | $childId" -ForegroundColor $status.Color -NoNewline
        Write-Host (" " * (23 - $childId.Length)) -NoNewline
        Write-Host "|" -ForegroundColor $status.Color

        $title = $task.title
        if ($title.Length -gt 22) { $title = $title.Substring(0, 19) + "..." }
        Write-Host "  | $($title.PadRight(22)) |" -ForegroundColor White
        Write-Host "  +------------------------+" -ForegroundColor $status.Color

        # Show dependencies with arrows
        $hasConnections = $false

        if ($internalBlockers.Count -gt 0) {
            Write-Host "        ^" -ForegroundColor Gray
            Write-Host "        | (blocked by within epic)" -ForegroundColor Gray
            foreach ($blockerId in $internalBlockers) {
                Write-Host "        +-- $blockerId" -ForegroundColor $colors.Blocked
            }
            $hasConnections = $true
        }

        if ($externalBlockers.Count -gt 0) {
            Write-Host "        ^" -ForegroundColor $colors.External
            Write-Host "        | (blocked by EXTERNAL)" -ForegroundColor $colors.External
            foreach ($blockerId in $externalBlockers) {
                Write-Host "        +-- $blockerId" -ForegroundColor $colors.External
            }
            $hasConnections = $true
        }

        if ($internalBlocks.Count -gt 0) {
            Write-Host "        |" -ForegroundColor Gray
            Write-Host "        v (blocks within epic)" -ForegroundColor Gray
            foreach ($blockedId in $internalBlocks) {
                Write-Host "        +-> $blockedId" -ForegroundColor $colors.Ready
            }
            $hasConnections = $true
        }

        if ($hasConnections) {
            Write-Host ""
        }

        Write-Host ""
    }

    # Summary
    Write-Host $doubleLine -ForegroundColor $colors.Header
    Write-Host " SUMMARY" -ForegroundColor $colors.Header
    Write-Host $doubleLine -ForegroundColor $colors.Header
    Write-Host ""

    $readyCount = ($Children | Where-Object { $readyIds -contains $_.id -and $_.status -ne "done" -and $_.status -ne "closed" }).Count
    $percentDisplay = "$percentage%"
    Write-Host "  Progress: $done/$total complete ($percentDisplay)" -ForegroundColor White
    Write-Host "  Ready to work: $readyCount tasks" -ForegroundColor $colors.Ready
    Write-Host "  External dependencies: $($externalDeps.Count) tasks from other epics" -ForegroundColor $colors.External
    Write-Host ""
}

# Main execution
Write-Host ""
Write-Host "Fetching epic: $EpicTag..." -ForegroundColor Cyan
Write-Host ""

# Get all issues
$allIssues = Get-BeadsIssues

# Find the epic
$epic = Find-Epic -Tag $EpicTag -AllIssues $allIssues

if (-not $epic) {
    Write-Host "Error: Could not find epic with tag '$EpicTag'" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available epics:" -ForegroundColor Yellow
    $epics = $allIssues | Where-Object { $_.issue_type -eq "epic" }
    foreach ($e in $epics) {
        Write-Host "  - $($e.id): $($e.title)" -ForegroundColor Gray
    }
    exit 1
}

# Get children
$children = Get-EpicChildren -EpicId $epic.id -AllIssues $allIssues

if ($children.Count -eq 0) {
    $epicIdDisplay = $epic.id
    Write-Host "Warning: Epic $epicIdDisplay has no child tasks" -ForegroundColor Yellow
    exit 0
}

# Get ready issues
$readyIssues = Get-BeadsReady

# Show the status
Show-EpicStatus -Epic $epic -Children $children -ReadyIssues $readyIssues -AllIssues $allIssues

Write-Host ""
