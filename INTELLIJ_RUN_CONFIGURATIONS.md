# IntelliJ IDEA Run Configurations Guide

This guide explains the IntelliJ IDEA run configurations for working with multiple agent worktrees.

## Available Run Configurations

After restarting IntelliJ (or syncing), you'll see these configurations in the Run dropdown (top-right):

### 🚀 Development Servers

**Individual Dev Servers:**
- **Dev Server** - Main repo on port 5173
- **Dev Server - Agent 1 (Port 5174)** - Agent 1 worktree
- **Dev Server - Agent 2 (Port 5175)** - Agent 2 worktree
- **Dev Server - Agent 3 (Port 5176)** - Agent 3 worktree
- **Dev Server - Agent 4 (Port 5177)** - Agent 4 worktree

**Run All At Once:**
- **Dev Server - All Agents** - Starts all 5 dev servers in parallel

### 🪟 Open Worktrees

**Individual Worktrees:**
- **Open Agent 1 Worktree** - Opens `meta-agent1` in new IntelliJ window
- **Open Agent 2 Worktree** - Opens `meta-agent2` in new IntelliJ window
- **Open Agent 3 Worktree** - Opens `meta-agent3` in new IntelliJ window
- **Open Agent 4 Worktree** - Opens `meta-agent4` in new IntelliJ window

**Open All At Once:**
- **Open All Worktrees** - Opens all 4 agent worktrees in separate windows

## How to Use

### Quick Access

1. **Run dropdown** (top-right corner) → Select configuration
2. **Keyboard shortcut:**
   - `Shift+F10` - Run selected configuration
   - `Ctrl+Shift+F10` - Run current file/context
   - `Alt+Shift+F10` - Show run menu

### Workflow 1: Start Dev Server for One Agent

1. Click Run dropdown (top-right)
2. Select **Dev Server - Agent 1 (Port 5174)**
3. Click the green Run button (▶️) or press `Shift+F10`
4. Server starts in terminal panel
5. Access at http://localhost:5174

### Workflow 2: Start All Dev Servers

1. Click Run dropdown
2. Select **Dev Server - All Agents**
3. Click Run button
4. All 5 servers start in separate terminal tabs
5. Access them at:
   - Main: http://localhost:5173
   - Agent 1: http://localhost:5174
   - Agent 2: http://localhost:5175
   - Agent 3: http://localhost:5176
   - Agent 4: http://localhost:5177

### Workflow 3: Open Worktrees in Separate Windows

1. Click Run dropdown
2. Select **Open Agent 1 Worktree**
3. Click Run button
4. New IntelliJ window opens with that worktree
5. Work in both windows simultaneously

### Workflow 4: Open All Worktrees

1. Click Run dropdown
2. Select **Open All Worktrees**
3. Click Run button
4. All 4 agent worktrees open in separate windows
5. Each window is independent with its own:
   - File tree
   - Terminal
   - Git status
   - Search scope

## Common Scenarios

### Two Agents Working on Different Beads

**Setup:**
```powershell
# Create worktrees first
.\worktree-manager.ps1 create -BranchName META-180
.\worktree-manager.ps1 create -BranchName META-181
```

**In IntelliJ:**
1. Select **Dev Server - All Agents** and Run
2. Select **Open All Worktrees** and Run
3. Now you have:
   - Main window: Your current branch
   - Agent 1 window: META-180
   - Agent 2 window: META-181
   - All dev servers running

**View changes:**
- Each window shows its own code
- Each has independent file tree
- Each has its own terminal
- Switch between windows with `Alt+Tab`

### Debug a Specific Agent

1. Open that agent's worktree window
2. Set breakpoints in the code
3. Use IntelliJ's JavaScript debugger
4. Attach to the dev server running on that port

## Terminal Panel Organization

When running **Dev Server - All Agents**, IntelliJ creates tabs in the Terminal panel:
- Each server gets its own tab
- Named by configuration (e.g., "Dev Server - Agent 1")
- Click between tabs to see different outputs
- Right-click tab to close/restart

## Stopping Servers

**Individual server:**
- Click the red Stop button (⏹️) in terminal tab

**All servers:**
- Click "Stop All" button in Run panel
- Or press `Ctrl+F2`

## Customization

### Change IntelliJ Installation Path

If your IntelliJ is installed elsewhere, edit these files and update the path:
- `.idea/runConfigurations/Open_Agent_1_Worktree.xml`
- `.idea/runConfigurations/Open_Agent_2_Worktree.xml`
- `.idea/runConfigurations/Open_Agent_3_Worktree.xml`
- `.idea/runConfigurations/Open_Agent_4_Worktree.xml`

Find this line and change the path:
```xml
<option name="SCRIPT_TEXT" value="start &quot;&quot; &quot;C:\Program Files\JetBrains\IntelliJ IDEA 2024.3\bin\idea64.exe&quot; &quot;$PROJECT_DIR$/../meta-agent1&quot;" />
```

Common paths:
- Standard: `C:\Program Files\JetBrains\IntelliJ IDEA 2024.3\bin\idea64.exe`
- Toolbox: `C:\Users\<username>\AppData\Local\JetBrains\Toolbox\apps\IDEA-U\ch-0\<version>\bin\idea64.exe`
- WebStorm: Replace `IDEA` with `WebStorm`

### Add More Agent Slots

To add Agent 5, 6, etc.:

1. Copy an existing dev server config file
2. Rename to `Dev_Server___Agent_5__Port_5178_.xml`
3. Update inside:
   - Name: `Dev Server - Agent 5 (Port 5178)`
   - Script: `npm run dev:agent5`
   - Working directory: `$PROJECT_DIR$/../meta-agent5`
4. Add `"dev:agent5": "vite --port 5178"` to package.json
5. Update compound config to include new server

## Troubleshooting

### Configuration not showing up

1. Close and reopen IntelliJ
2. Or: File → Invalidate Caches → Restart
3. Check that files exist in `.idea/runConfigurations/`

### "Worktree not found" error

The run configurations expect worktrees to exist. Create them first:
```powershell
.\worktree-manager.ps1 create -BranchName META-XXX
```

### Port already in use

If dev server fails:
1. Check if another instance is running
2. Stop it with the Stop button
3. Or change port in package.json and config file

### IntelliJ path wrong (Open Worktree doesn't work)

Edit the XML files and update the IntelliJ installation path to match your system.

### Can't see changes in other worktree

Each IntelliJ window is independent. To see changes:
1. Switch to that window (`Alt+Tab`)
2. Or commit/push and pull in other worktree
3. Or use git commands to view diffs

## Pro Tips

### Pin Frequently Used Configurations

1. Right-click configuration in Run dropdown
2. Select "Pin"
3. It stays at top of dropdown

### Keyboard Shortcuts

Create custom shortcuts for specific configurations:
1. Settings → Keymap
2. Search for "Run" → "Run..."
3. Find your configuration
4. Add keyboard shortcut

### Run Dashboard

View all running configurations:
1. View → Tool Windows → Run Dashboard
2. See all active servers
3. Start/stop from one place
4. Group by type

### Before Run Tasks

You can add pre-launch tasks like:
- `npm install` before starting server
- Run linter
- Compile TypeScript

To add:
1. Edit Run Configuration
2. "Before launch" section
3. Add task

## Integration with Tests

Your existing test configurations work the same way:
- **Run All Tests**
- **Run Tests (Watch Mode)**
- **Run Integration Tests**

These run in the main repo by default. To run tests in a worktree:
1. Open that worktree in new window
2. Use the test configurations there
3. Or create worktree-specific test configs

## Multi-Window Workflow Example

**Goal:** Work on two features simultaneously, see both in IDE

**Steps:**
1. Create worktrees:
   ```powershell
   .\worktree-manager.ps1 create -BranchName META-180
   .\worktree-manager.ps1 create -BranchName META-181
   ```

2. In main IntelliJ window:
   - Run → **Dev Server - All Agents**
   - Run → **Open All Worktrees**

3. You now have:
   - 3 IntelliJ windows (main + 2 agents)
   - 3 dev servers running
   - Independent file trees
   - Independent git status

4. Work flow:
   - Edit code in any window
   - Hot reload works independently
   - Commit from each window
   - Test in browser at different ports

5. When done:
   - Close extra windows
   - Stop servers (Ctrl+F2)
   - Remove worktrees when merged
