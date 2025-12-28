# Beads Epic Analyzer - Shows parallelization opportunities and critical path
# Usage: .\beads-epic-analyzer.ps1 META-45
# Or:    .\beads-epic-analyzer.ps1 meta-6fb

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

function Find-Epic {
    param([string]$Tag, [array]$AllIssues)

    # Try exact match first
    $epic = $AllIssues | Where-Object { $_.id -eq $Tag -and $_.issue_type -eq "epic" }
    if ($epic) { return $epic }

    # Try case-insensitive match
    $epic = $AllIssues | Where-Object { $_.id -eq $Tag.ToLower() -and $_.issue_type -eq "epic" }
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
    # e.g., epic "meta-6fb" has children "meta-6fb.1", "meta-6fb.2", etc.
    $children = $AllIssues | Where-Object {
        $_.id -like "$EpicId.*"
    }

    # Also check labels for cross-references (some tasks might use META tags)
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

function Build-DependencyGraph {
    param([array]$Children, [array]$ReadyIds)

    # Build dependency map
    $graph = @{}
    foreach ($child in $Children) {
        $deps = Get-IssueDependencies -IssueId $child.id
        $graph[$child.id] = @{
            task = $child
            blocks = $deps.blocks
            blocked_by = $deps.blocked_by
            is_ready = $ReadyIds -contains $child.id
        }
    }

    return $graph
}

function Show-TaskGraph {
    param([object]$Epic, [hashtable]$Graph, [array]$Children, [array]$ReadyIds)

    $singleLine = "-" * 80

    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host " DEPENDENCY GRAPH" -ForegroundColor $colors.Header
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host ""

    # Group tasks by their dependency level
    $levels = @{}
    $processed = @{}
    $level = 0

    # Level 0: Tasks with no dependencies (ready to start)
    $levels[$level] = @()
    foreach ($childId in $Graph.Keys) {
        $node = $Graph[$childId]
        if ($node.blocked_by.Count -eq 0 -and $node.task.status -ne "done" -and $node.task.status -ne "closed") {
            $levels[$level] += $childId
            $processed[$childId] = $true
        }
    }

    # Build subsequent levels
    $maxLevels = 10
    while ($level -lt $maxLevels) {
        $level++
        $levels[$level] = @()

        foreach ($childId in $Graph.Keys) {
            if ($processed[$childId]) { continue }

            $node = $Graph[$childId]
            if ($node.task.status -eq "done" -or $node.task.status -eq "closed") {
                continue
            }

            # Check if all blockers are in previous levels
            $allBlockersProcessed = $true
            foreach ($blockerId in $node.blocked_by) {
                if (-not $processed[$blockerId]) {
                    $allBlockersProcessed = $false
                    break
                }
            }

            if ($allBlockersProcessed -and $node.blocked_by.Count -gt 0) {
                $levels[$level] += $childId
                $processed[$childId] = $true
            }
        }

        # Stop if no more tasks at this level
        if ($levels[$level].Count -eq 0) {
            break
        }
    }

    # Display the graph
    Write-Host "  Legend - [READY] = No blockers | [BLCK] = Blocked | [DONE] = Complete" -ForegroundColor Gray
    Write-Host ""

    # Show epic at top
    Write-Host "  $($Epic.id)" -ForegroundColor $colors.Epic
    Write-Host "  |" -ForegroundColor Gray
    Write-Host "  +-- EPIC - $($Epic.title)" -ForegroundColor $colors.Epic
    Write-Host "      |" -ForegroundColor Gray

    # Show each level
    for ($i = 0; $i -le $level; $i++) {
        if ($levels[$i].Count -eq 0) { continue }

        if ($i -eq 0) {
            Write-Host "      +-- [LEVEL $i - READY - CAN START NOW]" -ForegroundColor $colors.Ready
        } else {
            Write-Host "      |" -ForegroundColor Gray
            $prevLevel = $i - 1
            Write-Host "      +-- [LEVEL $i - BLOCKED - NEEDS LEVEL $prevLevel]" -ForegroundColor $colors.Blocked
        }

        foreach ($taskId in $levels[$i]) {
            $task = $Graph[$taskId].task
            $isLast = ($taskId -eq $levels[$i][-1])
            $prefix = if ($isLast) { "          \`--" } else { "          +--" }

            $status = switch ($task.status) {
                "done" { "[DONE]"; break }
                "closed" { "[DONE]"; break }
                "in_progress" { "[PROG]"; break }
                default {
                    if ($ReadyIds -contains $taskId) { "[READY]" }
                    else { "[BLCK]" }
                }
            }

            $color = switch ($task.status) {
                "done" { $colors.Done; break }
                "closed" { $colors.Done; break }
                "in_progress" { $colors.InProgress; break }
                default {
                    if ($ReadyIds -contains $taskId) { $colors.Ready }
                    else { $colors.Blocked }
                }
            }

            Write-Host "$prefix $status $taskId" -ForegroundColor $color -NoNewline
            Write-Host ": $($task.title)" -ForegroundColor White

            # Show what this blocks
            if ($Graph[$taskId].blocks.Count -gt 0) {
                $blocksCount = $Graph[$taskId].blocks.Count
                $continuation = if ($isLast) { "              " } else { "          |   " }
                Write-Host "$continuation    |-> Blocks: $blocksCount task(s)" -ForegroundColor Gray
            }
        }
    }

    # Show completed tasks separately if any
    $completedTasks = $Children | Where-Object { $_.status -eq "done" -or $_.status -eq "closed" }
    if ($completedTasks.Count -gt 0) {
        Write-Host "      |" -ForegroundColor Gray
        Write-Host "      +-- [COMPLETED: $($completedTasks.Count) tasks]" -ForegroundColor $colors.Done
        foreach ($task in $completedTasks | Select-Object -First 5) {
            $isLast = ($task -eq ($completedTasks | Select-Object -First 5)[-1]) -and ($completedTasks.Count -le 5)
            $prefix = if ($isLast) { "          \`--" } else { "          +--" }
            Write-Host "$prefix [DONE] $($task.id): $($task.title)" -ForegroundColor $colors.Done
        }
        if ($completedTasks.Count -gt 5) {
            Write-Host "          \`-- ... and $($completedTasks.Count - 5) more" -ForegroundColor Gray
        }
    }

    Write-Host ""
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

    # Find nodes on critical path
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
    }
}

function Show-PertDiagram {
    param([object]$Epic, [hashtable]$Graph, [array]$Children, [array]$ReadyIds)

    $singleLine = "-" * 80

    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host " CRITICAL PATH DIAGRAM (PERT Chart)" -ForegroundColor $colors.Header
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host ""

    # Group tasks by their dependency level
    $levels = @{}
    $processed = @{}
    $level = 0

    # Include all tasks in the graph (including completed)
    $levels[$level] = @()
    foreach ($childId in $Graph.Keys) {
        $node = $Graph[$childId]
        if ($node.blocked_by.Count -eq 0) {
            $levels[$level] += $childId
            $processed[$childId] = $true
        }
    }

    # Build subsequent levels
    $maxLevels = 20
    while ($level -lt $maxLevels) {
        $level++
        $levels[$level] = @()

        foreach ($childId in $Graph.Keys) {
            if ($processed[$childId]) { continue }

            $node = $Graph[$childId]

            # Check if all blockers that are in this epic are in previous levels
            # Ignore blockers from other epics
            $allBlockersProcessed = $true
            $hasBlockersInEpic = $false
            foreach ($blockerId in $node.blocked_by) {
                # Only consider blockers that are part of this epic
                if ($Graph.ContainsKey($blockerId)) {
                    $hasBlockersInEpic = $true
                    if (-not $processed[$blockerId]) {
                        $allBlockersProcessed = $false
                        break
                    }
                }
            }

            if ($allBlockersProcessed -and $hasBlockersInEpic) {
                $levels[$level] += $childId
                $processed[$childId] = $true
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
    $indent = " " * 30
    Write-Host "$indent+========+" -ForegroundColor $colors.Epic
    Write-Host "$indent| START  |" -ForegroundColor $colors.Epic
    Write-Host "$indent+========+" -ForegroundColor $colors.Epic
    Write-Host "$indent    |" -ForegroundColor Gray

    # Show each level
    for ($i = 0; $i -le $level; $i++) {
        if ($levels[$i].Count -eq 0) { continue }

        $tasksAtLevel = $levels[$i]

        # Show vertical connector
        if ($i -gt 0) {
            Write-Host "$indent    |" -ForegroundColor Gray
        }

        Write-Host "$indent    v" -ForegroundColor Gray

        # Determine if we need to show branching
        if ($tasksAtLevel.Count -eq 1) {
            # Single task - no branching
            $taskId = $tasksAtLevel[0]
            $task = $Graph[$taskId].task
            $status = Get-TaskStatus -Task $task -ReadyIds $ReadyIds
            $isCritical = $criticalPathNodes -contains $taskId

            Write-Host "$indent+-----------------+" -ForegroundColor $status.Color

            $statusLine = "| " + $status.Symbol
            $statusLine = $statusLine.PadRight(18) + "|"
            Write-Host "$indent$statusLine" -ForegroundColor $status.Color

            $idLine = "| $taskId"
            $idLine = $idLine.PadRight(18) + "|"
            Write-Host "$indent$idLine" -ForegroundColor $status.Color

            $title = $task.title
            if ($title.Length -gt 15) { $title = $title.Substring(0, 15) }
            $titleLine = "| $title"
            $titleLine = $titleLine.PadRight(18) + "|"
            Write-Host "$indent$titleLine" -ForegroundColor White

            Write-Host "$indent+-----------------+" -ForegroundColor $status.Color

            if ($isCritical) {
                Write-Host "$indent  <- CRITICAL" -ForegroundColor $colors.Critical
            }

        } else {
            # Multiple tasks - show branching
            if ($tasksAtLevel.Count -eq 2) {
                Write-Host "$indent+-------+-------+" -ForegroundColor Gray
            } else {
                $branches = "+" + ("-" * 8)
                for ($b = 1; $b -lt $tasksAtLevel.Count - 1; $b++) {
                    $branches += "+" + ("-" * 8)
                }
                $branches += "+"
                Write-Host "$indent$branches" -ForegroundColor Gray
            }

            # Show each parallel task
            $hasCritical = $false
            for ($boxLine = 0; $boxLine -lt 5; $boxLine++) {
                $line = " " * 12

                foreach ($taskId in $tasksAtLevel) {
                    $task = $Graph[$taskId].task
                    $status = Get-TaskStatus -Task $task -ReadyIds $ReadyIds
                    $isCritical = $criticalPathNodes -contains $taskId

                    if ($isCritical) { $hasCritical = $true }

                    Write-Host $line -NoNewline

                    switch ($boxLine) {
                        0 {
                            Write-Host "+-----------------+" -NoNewline -ForegroundColor $status.Color
                        }
                        1 {
                            $statusLine = "| " + $status.Symbol
                            $statusLine = $statusLine.PadRight(18) + "|"
                            Write-Host $statusLine -NoNewline -ForegroundColor $status.Color
                        }
                        2 {
                            $idLine = "| $taskId"
                            $idLine = $idLine.PadRight(18) + "|"
                            Write-Host $idLine -NoNewline -ForegroundColor $status.Color
                        }
                        3 {
                            $title = $task.title
                            if ($title.Length -gt 15) { $title = $title.Substring(0, 15) }
                            $titleLine = "| $title"
                            $titleLine = $titleLine.PadRight(18) + "|"
                            Write-Host $titleLine -NoNewline -ForegroundColor White
                        }
                        4 {
                            Write-Host "+-----------------+" -NoNewline -ForegroundColor $status.Color
                        }
                    }

                    $line = " " * 5
                }

                # Show critical marker
                if ($boxLine -eq 0 -and $hasCritical) {
                    Write-Host "  <- CRITICAL" -ForegroundColor $colors.Critical
                } else {
                    Write-Host ""
                }
            }

            # Show merge if needed
            if ($tasksAtLevel.Count -eq 2 -and ($i -lt $level -and $levels[$i + 1].Count -gt 0)) {
                Write-Host "$indent+-------+-------+" -ForegroundColor Gray
            }
        }
    }

    # Show END
    Write-Host "$indent    |" -ForegroundColor Gray
    Write-Host "$indent    v" -ForegroundColor Gray
    Write-Host "$indent+========+" -ForegroundColor $colors.Epic
    Write-Host "$indent|  END   |" -ForegroundColor $colors.Epic
    Write-Host "$indent+========+" -ForegroundColor $colors.Epic
    Write-Host ""

    # Show summary
    $parallelCount = 0
    foreach ($levelTasks in $levels.Values) {
        if ($levelTasks.Count -gt $parallelCount) {
            $parallelCount = $levelTasks.Count
        }
    }

    Write-Host "Critical Path Length: $($criticalPathInfo.Length + 1) levels" -ForegroundColor $colors.Critical
    Write-Host "Max Parallel Tasks: $parallelCount" -ForegroundColor $colors.Ready
    Write-Host ""
}

function Show-EpicDiagram {
    param(
        [object]$Epic,
        [array]$Children,
        [array]$ReadyIssues
    )

    $doubleLineTop = "=" * 80
    $singleLine = "-" * 80

    # Header
    Write-Host ""
    Write-Host $doubleLineTop -ForegroundColor $colors.Epic
    Write-Host "  EPIC: $($Epic.id) - $($Epic.title)" -ForegroundColor $colors.Epic
    Write-Host $doubleLineTop -ForegroundColor $colors.Epic
    Write-Host ""

    # Epic Stats
    $total = $Children.Count
    $done = ($Children | Where-Object { $_.status -eq "done" -or $_.status -eq "closed" }).Count
    $inProgress = ($Children | Where-Object { $_.status -eq "in_progress" }).Count
    $open = ($Children | Where-Object { $_.status -eq "open" }).Count
    $percentage = if ($total -gt 0) { [math]::Round(($done / $total) * 100) } else { 0 }

    Write-Host "  Total Tasks: $total" -ForegroundColor White
    Write-Host "  [DONE] Done: $done ($percentage%)" -ForegroundColor $colors.Done
    Write-Host "  [PROG] In Progress: $inProgress" -ForegroundColor $colors.InProgress
    Write-Host "  [PEND] Open: $open" -ForegroundColor White
    Write-Host ""

    # Analyze dependencies and identify task groups
    $readyIds = $ReadyIssues | ForEach-Object { $_.id }

    # Build and show dependency graph
    $graph = Build-DependencyGraph -Children $Children -ReadyIds $readyIds
    Show-PertDiagram -Epic $Epic -Graph $graph -Children $Children -ReadyIds $readyIds
    $readyTasks = $Children | Where-Object { $readyIds -contains $_.id }
    $blockedTasks = $Children | Where-Object {
        $_.status -ne "done" -and $_.status -ne "closed" -and $readyIds -notcontains $_.id
    }

    # Identify critical path tasks (tasks that block many others)
    $criticalTasks = @()
    foreach ($child in $Children) {
        if ($child.dependent_count -gt 0 -and $child.status -ne "done" -and $child.status -ne "closed") {
            $criticalTasks += $child
        }
    }
    $criticalTasks = $criticalTasks | Sort-Object -Property dependent_count -Descending

    # Show parallelization analysis
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host " PARALLELIZATION ANALYSIS" -ForegroundColor $colors.Header
    Write-Host $singleLine -ForegroundColor $colors.Header
    Write-Host ""

    $readyCount = ($readyTasks | Where-Object { $_.status -ne "done" -and $_.status -ne "closed" }).Count
    Write-Host "  [DEPLOY] CAN DEPLOY: $readyCount agents in parallel" -ForegroundColor $colors.Ready
    Write-Host ""

    if ($criticalTasks.Count -gt 0) {
        Write-Host "  [!] CRITICAL PATH TASKS (block other tasks):" -ForegroundColor $colors.Critical
        foreach ($task in $criticalTasks | Select-Object -First 5) {
            $symbol = switch ($task.status) {
                "done" { "[DONE]" }
                "closed" { "[DONE]" }
                "in_progress" { "[PROG]" }
                default { "[PEND]" }
            }
            $color = switch ($task.status) {
                "done" { $colors.Done }
                "closed" { $colors.Done }
                "in_progress" { $colors.InProgress }
                default { $colors.Critical }
            }
            Write-Host "     $symbol $($task.id): $($task.title)" -ForegroundColor $color
            Write-Host "       |-> Blocks $($task.dependent_count) other task(s)" -ForegroundColor Gray
        }
        Write-Host ""
    }

    # Show ready tasks
    if ($readyTasks.Count -gt 0) {
        Write-Host $singleLine -ForegroundColor $colors.Ready
        Write-Host " READY TO START (No Blockers - Deploy Agents Here!)" -ForegroundColor $colors.Ready
        Write-Host $singleLine -ForegroundColor $colors.Ready
        Write-Host ""

        $readyOpen = $readyTasks | Where-Object { $_.status -eq "open" }
        $readyInProgress = $readyTasks | Where-Object { $_.status -eq "in_progress" }

        if ($readyInProgress) {
            Write-Host "  Currently In Progress:" -ForegroundColor $colors.InProgress
            foreach ($task in $readyInProgress) {
                Write-Host "  [PROG] $($task.id): $($task.title)" -ForegroundColor $colors.InProgress
            }
            Write-Host ""
        }

        if ($readyOpen) {
            Write-Host "  Available to Start:" -ForegroundColor $colors.Ready
            $counter = 1
            foreach ($task in $readyOpen) {
                Write-Host "  $counter. $($task.id): $($task.title)" -ForegroundColor $colors.Ready
                $counter++
            }
            Write-Host ""
        }
    }

    # Show blocked tasks
    if ($blockedTasks.Count -gt 0) {
        Write-Host $singleLine -ForegroundColor $colors.Blocked
        Write-Host " BLOCKED TASKS (Cannot Start Yet)" -ForegroundColor $colors.Blocked
        Write-Host $singleLine -ForegroundColor $colors.Blocked
        Write-Host ""

        foreach ($task in $blockedTasks | Select-Object -First 10) {
            Write-Host "  [BLCK] $($task.id): $($task.title)" -ForegroundColor $colors.Blocked
            if ($task.dependency_count -gt 0) {
                Write-Host "    |-> Waiting on $($task.dependency_count) task(s)" -ForegroundColor Gray
            }
        }

        if ($blockedTasks.Count -gt 10) {
            Write-Host ""
            Write-Host "  ... and $($blockedTasks.Count - 10) more blocked tasks" -ForegroundColor Gray
        }
        Write-Host ""
    }

    # Show completed tasks summary
    if ($done -gt 0) {
        Write-Host $singleLine -ForegroundColor $colors.Done
        Write-Host " COMPLETED TASKS ($done)" -ForegroundColor $colors.Done
        Write-Host $singleLine -ForegroundColor $colors.Done
        Write-Host ""

        $completedTasks = $Children | Where-Object { $_.status -eq "done" -or $_.status -eq "closed" }
        foreach ($task in $completedTasks | Select-Object -First 5) {
            Write-Host "  [DONE] $($task.id): $($task.title)" -ForegroundColor $colors.Done
        }

        if ($done -gt 5) {
            Write-Host "  ... and $($done - 5) more completed" -ForegroundColor Gray
        }
        Write-Host ""
    }

    # Final recommendations
    Write-Host $doubleLineTop -ForegroundColor $colors.Header
    Write-Host " RECOMMENDATIONS" -ForegroundColor $colors.Header
    Write-Host $doubleLineTop -ForegroundColor $colors.Header
    Write-Host ""

    if ($readyCount -gt 0) {
        Write-Host "  1. Deploy up to $readyCount agents in parallel" -ForegroundColor White
        Write-Host "  2. Focus on critical path tasks first (they unblock others)" -ForegroundColor White

        if ($criticalTasks.Count -gt 0) {
            $topCritical = $criticalTasks | Where-Object { $readyIds -contains $_.id } | Select-Object -First 1
            if ($topCritical) {
                Write-Host "  3. Top priority: $($topCritical.id) (blocks $($topCritical.dependent_count) tasks)" -ForegroundColor $colors.Critical
            }
        }
    } else {
        if ($inProgress -gt 0) {
            Write-Host "  * Complete in-progress tasks to unblock more work" -ForegroundColor $colors.InProgress
        } else {
            Write-Host "  * All tasks complete or blocked - review dependencies" -ForegroundColor $colors.Done
        }
    }

    Write-Host ""
    Write-Host $doubleLineTop -ForegroundColor $colors.Header
    Write-Host ""
}

# Main execution
Write-Host ""
Write-Host "Analyzing beads epic: $EpicTag..." -ForegroundColor Cyan
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
    Write-Host "Warning: Epic '$($epic.id)' has no child tasks" -ForegroundColor Yellow
    exit 0
}

# Get ready issues
$readyIssues = Get-BeadsReady

# Show the diagram
Show-EpicDiagram -Epic $epic -Children $children -ReadyIssues $readyIssues

Write-Host ""
