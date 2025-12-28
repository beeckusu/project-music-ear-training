# UTF-8 with BOM
# Full Project PERT Diagram Generator for All Bead Tickets
# Shows critical path and dependencies across entire project

param(
    [Parameter(Mandatory=$false)]
    [switch]$IncludeCompleted
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
    Critical = "Magenta"
    Header = "White"
}

function Get-BeadsIssues {
    $output = bd list --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error running 'bd list': $output" -ForegroundColor Red
        exit 1
    }
    return $output | ConvertFrom-Json
}

function Get-BeadsReady {
    $output = bd ready --json --limit 1000 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error running 'bd ready': $output" -ForegroundColor Red
        exit 1
    }
    return $output | ConvertFrom-Json
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

    $issue = $output | ConvertFrom-Json

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

    return @{
        blocks = $blocks
        blocked_by = $blocked_by
    }
}

function Build-FullDependencyGraph {
    param([array]$AllIssues, [array]$ReadyIds)

    Write-Host "Building dependency graph for $($AllIssues.Count) issues..." -ForegroundColor Cyan

    # Build dependency map
    $graph = @{}
    $progressCounter = 0
    foreach ($issue in $AllIssues) {
        $progressCounter++
        if ($progressCounter % 10 -eq 0) {
            Write-Host "  Progress: $progressCounter/$($AllIssues.Count)" -ForegroundColor Gray
        }

        $deps = Get-IssueDependencies -IssueId $issue.id
        $graph[$issue.id] = @{
            task = $issue
            blocks = $deps.blocks
            blocked_by = $deps.blocked_by
            is_ready = $ReadyIds -contains $issue.id
        }
    }

    Write-Host "  Complete!" -ForegroundColor Green
    Write-Host ""

    return $graph
}

function Get-TaskStatus {
    param([object]$Task, [array]$ReadyIds)

    switch ($Task.status) {
        "done" { return @{ Symbol = "[DONE]"; Color = $colors.Done } }
        "closed" { return @{ Symbol = "[DONE]"; Color = $colors.Done } }
        "in_progress" { return @{ Symbol = "[PROG]"; Color = $colors.InProgress } }
        default {
            if ($ReadyIds -contains $Task.id) {
                return @{ Symbol = "[READY]"; Color = $colors.Ready }
            } else {
                return @{ Symbol = "[BLCK]"; Color = $colors.Blocked }
            }
        }
    }
}

function Calculate-CriticalPath {
    param([hashtable]$Graph)

    # Calculate the longest path from each node to completion
    $distances = @{}

    # Initialize all distances
    foreach ($nodeId in $Graph.Keys) {
        $distances[$nodeId] = 0
    }

    # Calculate distances using topological ordering
    $visited = @{}
    $stack = @()

    function Visit-Node {
        param([string]$NodeId)
        if ($visited[$NodeId]) { return }
        $visited[$NodeId] = $true

        foreach ($blockerId in $Graph[$NodeId].blocked_by) {
            if ($Graph.ContainsKey($blockerId)) {
                Visit-Node -NodeId $blockerId
            }
        }
        $script:stack += $NodeId
    }

    foreach ($nodeId in $Graph.Keys) {
        Visit-Node -NodeId $nodeId
    }

    # Calculate longest paths
    [array]::Reverse($stack)
    foreach ($nodeId in $stack) {
        $maxDist = 0
        foreach ($blockerId in $Graph[$nodeId].blocked_by) {
            if ($Graph.ContainsKey($blockerId)) {
                $maxDist = [Math]::Max($maxDist, $distances[$blockerId] + 1)
            }
        }
        $distances[$nodeId] = $maxDist
    }

    # Find nodes on critical path (those with maximum distance)
    $maxDistance = ($distances.Values | Measure-Object -Maximum).Maximum
    $criticalPath = @()
    foreach ($nodeId in $Graph.Keys) {
        if ($distances[$nodeId] -eq $maxDistance) {
            $criticalPath += $nodeId
        }
    }

    return @{
        Path = $criticalPath
        Length = $maxDistance
        Distances = $distances
    }
}

function Show-FullPertDiagram {
    param([hashtable]$Graph, [array]$AllIssues, [array]$ReadyIds)

    $singleLine = "-" * 100
    $doubleLine = "=" * 100

    Write-Host $doubleLine -ForegroundColor $colors.Header
    Write-Host " FULL PROJECT PERT DIAGRAM - ALL TICKETS" -ForegroundColor $colors.Header
    Write-Host $doubleLine -ForegroundColor $colors.Header
    Write-Host ""

    # Group tasks by their dependency level
    $levels = @{}
    $processed = @{}
    $level = 0

    # Include all tasks in the graph
    $levels[$level] = @()
    foreach ($issueId in $Graph.Keys) {
        $node = $Graph[$issueId]
        if ($node.blocked_by.Count -eq 0) {
            $levels[$level] += $issueId
            $processed[$issueId] = $true
        }
    }

    # Build subsequent levels
    $maxLevels = 50
    while ($level -lt $maxLevels) {
        $level++
        $levels[$level] = @()

        foreach ($issueId in $Graph.Keys) {
            if ($processed[$issueId]) { continue }

            $node = $Graph[$issueId]

            # Check if all blockers are in previous levels
            $allBlockersProcessed = $true
            $hasBlockers = $false
            foreach ($blockerId in $node.blocked_by) {
                if ($Graph.ContainsKey($blockerId)) {
                    $hasBlockers = $true
                    if (-not $processed[$blockerId]) {
                        $allBlockersProcessed = $false
                        break
                    }
                }
            }

            if ($allBlockersProcessed -and $hasBlockers) {
                $levels[$level] += $issueId
                $processed[$issueId] = $true
            }
        }

        # Stop if no more tasks at this level
        if ($levels[$level].Count -eq 0) {
            break
        }
    }

    # Calculate critical path
    $criticalPathInfo = Calculate-CriticalPath -Graph $Graph
    $criticalPathNodes = $criticalPathInfo.Path

    # Display legend
    Write-Host "  Legend: " -NoNewline -ForegroundColor Gray
    Write-Host "[DONE]" -NoNewline -ForegroundColor $colors.Done
    Write-Host "=Complete  " -NoNewline -ForegroundColor Gray
    Write-Host "[PROG]" -NoNewline -ForegroundColor $colors.InProgress
    Write-Host "=In Progress  " -NoNewline -ForegroundColor Gray
    Write-Host "[READY]" -NoNewline -ForegroundColor $colors.Ready
    Write-Host "=Can Start  " -NoNewline -ForegroundColor Gray
    Write-Host "[BLCK]" -NoNewline -ForegroundColor $colors.Blocked
    Write-Host "=Blocked" -ForegroundColor Gray
    Write-Host ""

    # Show START
    Write-Host "  START" -ForegroundColor $colors.Epic
    Write-Host "   |" -ForegroundColor Gray

    # Show each level with summary
    for ($i = 0; $i -le $level; $i++) {
        if ($levels[$i].Count -eq 0) { continue }

        $tasksAtLevel = $levels[$i]
        $levelColor = if ($i -eq 0) { $colors.Ready } else { $colors.Blocked }

        # Show level header
        Write-Host "   v" -ForegroundColor Gray
        Write-Host "  +-- LEVEL $i ($($tasksAtLevel.Count) tasks)" -ForegroundColor $levelColor

        # Group by status
        $doneAtLevel = @($tasksAtLevel | Where-Object { $Graph[$_].task.status -eq "done" -or $Graph[$_].task.status -eq "closed" })
        $progAtLevel = @($tasksAtLevel | Where-Object { $Graph[$_].task.status -eq "in_progress" })
        $readyAtLevel = @($tasksAtLevel | Where-Object { $ReadyIds -contains $_ -and $Graph[$_].task.status -notin @("done", "closed", "in_progress") })
        $blockedAtLevel = @($tasksAtLevel | Where-Object {
            $ReadyIds -notcontains $_ -and $Graph[$_].task.status -notin @("done", "closed", "in_progress")
        })

        # Show summary
        if ($doneAtLevel.Count -gt 0) {
            Write-Host "  |   [DONE] $($doneAtLevel.Count) complete" -ForegroundColor $colors.Done
        }
        if ($progAtLevel.Count -gt 0) {
            Write-Host "  |   [PROG] $($progAtLevel.Count) in progress" -ForegroundColor $colors.InProgress
        }
        if ($readyAtLevel.Count -gt 0) {
            Write-Host "  |   [READY] $($readyAtLevel.Count) ready to start" -ForegroundColor $colors.Ready
        }
        if ($blockedAtLevel.Count -gt 0) {
            Write-Host "  |   [BLCK] $($blockedAtLevel.Count) blocked" -ForegroundColor $colors.Blocked
        }

        # Show critical path tasks at this level
        $criticalAtLevel = @($tasksAtLevel | Where-Object { $criticalPathNodes -contains $_ })
        if ($criticalAtLevel.Count -gt 0) {
            Write-Host "  |   ** CRITICAL PATH: $($criticalAtLevel.Count) tasks **" -ForegroundColor $colors.Critical
            foreach ($taskId in $criticalAtLevel | Select-Object -First 3) {
                $task = $Graph[$taskId].task
                $status = Get-TaskStatus -Task $task -ReadyIds $ReadyIds
                Write-Host "  |      $($status.Symbol) ${taskId}: $($task.title)" -ForegroundColor $colors.Critical
            }
            if ($criticalAtLevel.Count -gt 3) {
                Write-Host "  |      ... and $($criticalAtLevel.Count - 3) more" -ForegroundColor Gray
            }
        }

        # Show sample tasks if needed
        if ($tasksAtLevel.Count -le 10) {
            foreach ($taskId in $tasksAtLevel) {
                $task = $Graph[$taskId].task
                $status = Get-TaskStatus -Task $task -ReadyIds $ReadyIds
                $isCritical = $criticalPathNodes -contains $taskId
                $criticalMarker = if ($isCritical) { " *CRITICAL*" } else { "" }
                Write-Host "  |   $($status.Symbol) ${taskId}: $($task.title)$criticalMarker" -ForegroundColor $status.Color
            }
        }

        Write-Host "  |" -ForegroundColor Gray
    }

    # Show END
    Write-Host "   v" -ForegroundColor Gray
    Write-Host "  END" -ForegroundColor $colors.Epic
    Write-Host ""

    # Show summary
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host " PROJECT STATISTICS" -ForegroundColor $colors.Header
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host ""

    $totalTasks = $AllIssues.Count
    $doneTasks = ($AllIssues | Where-Object { $_.status -eq "done" -or $_.status -eq "closed" }).Count
    $inProgressTasks = ($AllIssues | Where-Object { $_.status -eq "in_progress" }).Count
    $readyTasks = ($AllIssues | Where-Object { $ReadyIds -contains $_.id -and $_.status -notin @("done", "closed", "in_progress") }).Count
    $blockedTasks = $totalTasks - $doneTasks - $inProgressTasks - $readyTasks
    $percentage = if ($totalTasks -gt 0) { [math]::Round(($doneTasks / $totalTasks) * 100) } else { 0 }

    Write-Host "  Total Tasks: $totalTasks" -ForegroundColor White
    Write-Host "  [DONE] Complete: $doneTasks ($percentage%)" -ForegroundColor $colors.Done
    Write-Host "  [PROG] In Progress: $inProgressTasks" -ForegroundColor $colors.InProgress
    Write-Host "  [READY] Ready to Start: $readyTasks" -ForegroundColor $colors.Ready
    Write-Host "  [BLCK] Blocked: $blockedTasks" -ForegroundColor $colors.Blocked
    Write-Host ""
    Write-Host "  Critical Path Length: $($criticalPathInfo.Length + 1) levels" -ForegroundColor $colors.Critical
    Write-Host "  Total Dependency Levels: $($level + 1)" -ForegroundColor White
    Write-Host ""

    # Show parallelization analysis
    $parallelCount = 0
    foreach ($levelTasks in $levels.Values) {
        if ($levelTasks.Count -gt $parallelCount) {
            $parallelCount = $levelTasks.Count
        }
    }
    Write-Host "  Max Parallel Tasks: $parallelCount" -ForegroundColor $colors.Ready
    Write-Host ""
}

function Show-CriticalPathDetails {
    param([hashtable]$Graph, [array]$CriticalPath, [array]$ReadyIds)

    $singleLine = "-" * 100

    Write-Host $singleLine -ForegroundColor $colors.Critical
    Write-Host " CRITICAL PATH TASKS (Longest Chain of Dependencies)" -ForegroundColor $colors.Critical
    Write-Host $singleLine -ForegroundColor $colors.Critical
    Write-Host ""

    Write-Host "  These tasks form the critical path - delays here affect the entire project timeline" -ForegroundColor Gray
    Write-Host ""

    $incompleteCritical = @($CriticalPath | Where-Object {
        $Graph[$_].task.status -ne "done" -and $Graph[$_].task.status -ne "closed"
    })

    if ($incompleteCritical.Count -eq 0) {
        Write-Host "  All critical path tasks are complete!" -ForegroundColor $colors.Done
    } else {
        foreach ($taskId in $incompleteCritical) {
            $task = $Graph[$taskId].task
            $status = Get-TaskStatus -Task $task -ReadyIds $ReadyIds

            Write-Host "  $($status.Symbol) ${taskId}: $($task.title)" -ForegroundColor $status.Color

            # Show blockers
            if ($Graph[$taskId].blocked_by.Count -gt 0) {
                $blockers = $Graph[$taskId].blocked_by | Where-Object { $Graph.ContainsKey($_) }
                if ($blockers.Count -gt 0) {
                    Write-Host "      |-> Blocked by: $($blockers -join ', ')" -ForegroundColor Gray
                } else {
                    # All blockers are completed/filtered out
                    Write-Host "      |-> Blocked by: (all blockers completed)" -ForegroundColor Gray
                }
            }

            # Show what it blocks
            if ($Graph[$taskId].blocks.Count -gt 0) {
                $blocks = $Graph[$taskId].blocks | Where-Object { $Graph.ContainsKey($_) }
                Write-Host "      |-> Blocks: $($blocks -join ', ')" -ForegroundColor Gray
            }
            Write-Host ""
        }
    }

    Write-Host ""
}

function Show-ReadyTasks {
    param([hashtable]$Graph, [array]$ReadyIds, [array]$CriticalPath)

    $singleLine = "-" * 100

    $readyTasks = @($ReadyIds | Where-Object {
        $Graph[$_].task.status -notin @("done", "closed")
    })

    if ($readyTasks.Count -eq 0) {
        Write-Host "  No tasks ready to start (all unblocked tasks are in progress or complete)" -ForegroundColor Yellow
        return
    }

    Write-Host $singleLine -ForegroundColor $colors.Ready
    Write-Host " READY TO START ($($readyTasks.Count) tasks - No Blockers)" -ForegroundColor $colors.Ready
    Write-Host $singleLine -ForegroundColor $colors.Ready
    Write-Host ""

    # Split into critical and non-critical
    $readyCritical = @($readyTasks | Where-Object { $CriticalPath -contains $_ })
    $readyNonCritical = @($readyTasks | Where-Object { $CriticalPath -notcontains $_ })

    if ($readyCritical.Count -gt 0) {
        Write-Host "  ** HIGH PRIORITY - CRITICAL PATH **" -ForegroundColor $colors.Critical
        foreach ($taskId in $readyCritical) {
            $task = $Graph[$taskId].task
            $status = Get-TaskStatus -Task $task -ReadyIds $ReadyIds
            Write-Host "  $($status.Symbol) ${taskId}: $($task.title)" -ForegroundColor $colors.Critical
            if ($Graph[$taskId].blocks.Count -gt 0) {
                Write-Host "      |-> Blocks $($Graph[$taskId].blocks.Count) task(s)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }

    if ($readyNonCritical.Count -gt 0) {
        Write-Host "  ** NORMAL PRIORITY **" -ForegroundColor $colors.Ready
        $counter = 1
        foreach ($taskId in $readyNonCritical | Select-Object -First 20) {
            $task = $Graph[$taskId].task
            $status = Get-TaskStatus -Task $task -ReadyIds $ReadyIds
            Write-Host "  $counter. $($status.Symbol) ${taskId}: $($task.title)" -ForegroundColor $colors.Ready
            if ($Graph[$taskId].blocks.Count -gt 0) {
                Write-Host "      |-> Blocks $($Graph[$taskId].blocks.Count) task(s)" -ForegroundColor Gray
            }
            $counter++
        }
        if ($readyNonCritical.Count -gt 20) {
            Write-Host "  ... and $($readyNonCritical.Count - 20) more ready tasks" -ForegroundColor Gray
        }
    }

    Write-Host ""
}

# Main execution
Write-Host ""
Write-Host "=" * 100 -ForegroundColor Cyan
Write-Host "FULL PROJECT PERT DIAGRAM ANALYZER" -ForegroundColor Cyan
Write-Host "=" * 100 -ForegroundColor Cyan
Write-Host ""

# Get all issues
Write-Host "Fetching all bead issues..." -ForegroundColor Cyan
$allIssues = Get-BeadsIssues

# Filter out completed if requested
if (-not $IncludeCompleted) {
    $originalCount = $allIssues.Count
    $allIssues = @($allIssues | Where-Object { $_.status -ne "done" -and $_.status -ne "closed" })
    $filteredCount = $originalCount - $allIssues.Count
    if ($filteredCount -gt 0) {
        Write-Host "  Filtered out $filteredCount completed tasks" -ForegroundColor Gray
        Write-Host "  (Use -IncludeCompleted to include them)" -ForegroundColor Gray
    }
}

Write-Host "  Found $($allIssues.Count) issues" -ForegroundColor Green
Write-Host ""

# Get ready issues
Write-Host "Fetching ready issues..." -ForegroundColor Cyan
$readyIssues = Get-BeadsReady
$readyIds = $readyIssues | ForEach-Object { $_.id }
Write-Host "  Found $($readyIds.Count) ready issues" -ForegroundColor Green
Write-Host ""

# Build dependency graph
$graph = Build-FullDependencyGraph -AllIssues $allIssues -ReadyIds $readyIds

# Calculate critical path
Write-Host "Calculating critical path..." -ForegroundColor Cyan
$criticalPathInfo = Calculate-CriticalPath -Graph $graph
Write-Host "  Critical path length: $($criticalPathInfo.Length + 1) levels" -ForegroundColor Green
Write-Host "  Critical path contains: $($criticalPathInfo.Path.Count) tasks" -ForegroundColor Green
Write-Host ""

# Show the full PERT diagram
Show-FullPertDiagram -Graph $graph -AllIssues $allIssues -ReadyIds $readyIds

# Show critical path details
Show-CriticalPathDetails -Graph $graph -CriticalPath $criticalPathInfo.Path -ReadyIds $readyIds

# Show ready tasks
Show-ReadyTasks -Graph $graph -ReadyIds $readyIds -CriticalPath $criticalPathInfo.Path

# Final summary
Write-Host "=" * 100 -ForegroundColor Cyan
Write-Host " RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "=" * 100 -ForegroundColor Cyan
Write-Host ""

$readyCount = @($readyIds | Where-Object { $graph[$_].task.status -notin @("done", "closed") }).Count
$readyCriticalCount = @($criticalPathInfo.Path | Where-Object {
    $readyIds -contains $_ -and $graph[$_].task.status -notin @("done", "closed")
}).Count

if ($readyCount -gt 0) {
    Write-Host "  1. You have $readyCount task(s) ready to start" -ForegroundColor White
    if ($readyCriticalCount -gt 0) {
        Write-Host "  2. PRIORITY: $readyCriticalCount of these are on the CRITICAL PATH" -ForegroundColor $colors.Critical
        Write-Host "  3. Focus on critical path tasks first to minimize project duration" -ForegroundColor White
    } else {
        Write-Host "  2. No critical path tasks are currently unblocked" -ForegroundColor Yellow
        Write-Host "  3. Work on ready tasks to eventually unblock critical path" -ForegroundColor White
    }
} else {
    Write-Host "  * No tasks are currently ready to start" -ForegroundColor Yellow
    Write-Host "  * Complete in-progress tasks to unblock more work" -ForegroundColor White
}

Write-Host ""
Write-Host "=" * 100 -ForegroundColor Cyan
Write-Host ""
