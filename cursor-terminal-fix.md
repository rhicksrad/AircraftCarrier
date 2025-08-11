# Cursor Terminal Fix: Powerlevel10k Agent Compatibility

## 🚨 The Problem
When using Cursor AI with Powerlevel10k theme, agent terminals can hang or become unresponsive because:
- Powerlevel10k's instant prompt waits for user interaction
- Complex prompt elements slow down non-interactive shells
- Git status checks and other features cause delays in agent environments

## 🎯 The Solution
Use `VSCODE_SHELL_INTEGRATION` environment variable to detect agent terminals and apply minimal configuration only where needed.

### 🔍 Environment Detection
| Environment | `VSCODE_SHELL_INTEGRATION` | Behavior |
|-------------|---------------------------|----------|
| **Agent Terminal** | `'1'` | ❌ Minimal prompt, no Powerlevel10k |
| **IDE Built-in Terminal** | `''` (empty) | ✅ Full Powerlevel10k theme |

## 🛠️ Implementation

### Step 1: Backup Your Current .zshrc
```bash
cp ~/.zshrc ~/.zshrc.backup
```

### Step 2: Add Agent Detection (Top of .zshrc)
Add this **BEFORE** your existing Powerlevel10k configuration:

```bash
# ==========================================
# CURSOR AGENT TERMINAL FIX
# ==========================================
# Agent detection - only activate minimal mode for actual agents  
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  # Disable Powerlevel10k instant prompt for agents
  POWERLEVEL9K_INSTANT_PROMPT=off
  
  # Minimal prompt elements for agents
  POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(dir vcs)
  POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=()
  
  # Ensure non-interactive mode
  export DEBIAN_FRONTEND=noninteractive
  export NONINTERACTIVE=1
  
  echo "🤖 Agent terminal detected - using minimal configuration"
fi
```

### Step 3: Modify Theme Selection
Replace your existing `ZSH_THEME` line with:

```bash
# Theme selection - disable only for agents
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  ZSH_THEME=""  # Disable Powerlevel10k for agents
else
  ZSH_THEME="powerlevel10k/powerlevel10k"  # Full theme for IDE terminal
fi
```

### Step 4: Add Minimal Prompt Configuration (After Oh My Zsh source)
Add this **AFTER** your `source $ZSH/oh-my-zsh.sh` line:

```bash
# ==========================================
# AGENT-SPECIFIC CONFIGURATION
# ==========================================
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  # Simple, fast prompt for agents
  PROMPT='%F{cyan}%n@%m%f:%F{yellow}%~%f%# '
  RPROMPT=''
  
  # Disable interactive features
  unsetopt CORRECT
  unsetopt CORRECT_ALL
  unsetopt AUTO_CD
  
  # Disable annoying sounds
  setopt NO_BEEP
  setopt NO_HIST_BEEP  
  setopt NO_LIST_BEEP
  
  # Fast command execution
  setopt NO_BG_NICE
  setopt NO_HUP
  setopt NO_CHECK_JOBS
  
  # Agent-friendly aliases
  alias rm='rm -f'
  alias cp='cp -f' 
  alias mv='mv -f'
  alias mkdir='mkdir -p'
  alias npm='npm --no-fund --no-audit --silent'
  alias yarn='yarn --non-interactive --silent'
  alias pip='pip --quiet --disable-pip-version-check'
  alias git='git -c advice.detachedHead=false -c init.defaultBranch=main'
  
  # Disable Git status for speed
  export GIT_PS1_SHOWDIRTYSTATE=false
  export GIT_PS1_SHOWSTASHSTATE=false
  export GIT_PS1_SHOWUNTRACKEDFILES=false
  export GIT_PS1_SHOWUPSTREAM=false
  
  echo "✅ Agent configuration loaded"
else
  # Load full Powerlevel10k configuration for IDE terminal
  [[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
fi
```

## 📝 Complete .zshrc Template

Here's a complete example of how your .zshrc should look:

```bash
#!/bin/zsh
# ==========================================
# CURSOR AGENT TERMINAL FIX
# ==========================================
# Agent detection - only activate minimal mode for actual agents  
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  POWERLEVEL9K_INSTANT_PROMPT=off
  POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(dir vcs)
  POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=()
  export DEBIAN_FRONTEND=noninteractive
  export NONINTERACTIVE=1
  echo "🤖 Agent terminal detected - using minimal configuration"
fi

# Enable Powerlevel10k instant prompt (for IDE terminal only)
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# Oh My Zsh configuration
export ZSH="$HOME/.oh-my-zsh"

# Theme selection - disable only for agents
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  ZSH_THEME=""  # Disable Powerlevel10k for agents
else
  ZSH_THEME="powerlevel10k/powerlevel10k"  # Full theme for IDE terminal
fi

# Plugins
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)

# Source Oh My Zsh
source $ZSH/oh-my-zsh.sh

# ==========================================
# AGENT-SPECIFIC CONFIGURATION
# ==========================================
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  # Simple, fast prompt for agents
  PROMPT='%F{cyan}%n@%m%f:%F{yellow}%~%f%# '
  RPROMPT=''
  
  # Disable interactive features
  unsetopt CORRECT
  unsetopt CORRECT_ALL
  unsetopt AUTO_CD
  setopt NO_BEEP
  setopt NO_HIST_BEEP  
  setopt NO_LIST_BEEP
  setopt NO_BG_NICE
  setopt NO_HUP
  setopt NO_CHECK_JOBS
  
  # Agent-friendly aliases
  alias rm='rm -f'
  alias cp='cp -f' 
  alias mv='mv -f'
  alias mkdir='mkdir -p'
  alias npm='npm --no-fund --no-audit --silent'
  alias yarn='yarn --non-interactive --silent'
  alias pip='pip --quiet --disable-pip-version-check'
  alias git='git -c advice.detachedHead=false -c init.defaultBranch=main'
  
  # Disable Git status for speed
  export GIT_PS1_SHOWDIRTYSTATE=false
  export GIT_PS1_SHOWSTASHSTATE=false
  export GIT_PS1_SHOWUNTRACKEDFILES=false
  export GIT_PS1_SHOWUPSTREAM=false
  
  echo "✅ Agent configuration loaded"
else
  # Load full Powerlevel10k configuration for IDE terminal
  [[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
fi

# ==========================================
# YOUR CUSTOM CONFIGURATION
# ==========================================
# Add your personal aliases, exports, and functions here
```

## ✅ Testing the Fix

### 1. Test Agent Terminal
Run this in Cursor's agent terminal:
```bash
echo "VSCODE_SHELL_INTEGRATION: '$VSCODE_SHELL_INTEGRATION'"
echo "Current prompt: $PROMPT"
```

**Expected output:**
```
🤖 Agent terminal detected - using minimal configuration
VSCODE_SHELL_INTEGRATION: '1'
✅ Agent configuration loaded
Current prompt: %F{cyan}%n@%m%f:%F{yellow}%~%f%# 
```

### 2. Test IDE Terminal
Run this in Cursor's built-in terminal:
```bash
echo "VSCODE_SHELL_INTEGRATION: '$VSCODE_SHELL_INTEGRATION'"
echo "Theme: $ZSH_THEME"
```

**Expected output:**
```
VSCODE_SHELL_INTEGRATION: 
Theme: powerlevel10k/powerlevel10k
```

## 🎯 Results

### ✅ Agent Terminals
- ⚡ **Fast startup** (no Powerlevel10k delays)
- 🚫 **No hangs** (instant prompt disabled)
- 📝 **Minimal prompt** (just username, directory, and prompt)
- 🔇 **Silent operations** (no beeps or confirmations)

### ✅ IDE Built-in Terminal
- 🎨 **Full Powerlevel10k theme** (all features enabled)
- ⚡ **Git status** (full repository information)
- 🎯 **Custom segments** (all your configured elements)
- 💫 **Instant prompt** (fast startup)

## 🔧 Troubleshooting

### Issue: Still getting hangs in agent terminal
**Solution:** Check if you have any custom Powerlevel10k config that's still loading:
```bash
echo $POWERLEVEL9K_CONFIG_FILE
```

### Issue: No theme in IDE terminal
**Solution:** Verify Powerlevel10k is installed:
```bash
ls ~/.oh-my-zsh/custom/themes/powerlevel10k
```

### Issue: Environment variable not detected
**Solution:** Test the detection manually:
```bash
[[ -n "$VSCODE_SHELL_INTEGRATION" ]] && echo "Agent detected" || echo "IDE terminal"
```

## 🚀 Additional Optimizations

### For Even Faster Agent Performance
Add these to the agent section:

```bash
# Disable history for agents
HISTFILE=""
SAVEHIST=0

# Disable completion for speed
setopt NO_AUTO_MENU
setopt NO_AUTO_LIST

# Minimal PATH for agents
export PATH="/usr/local/bin:/usr/bin:/bin"
```

### For Better IDE Terminal Experience
Add these to the else section:

```bash
# Enhanced IDE terminal features
setopt AUTO_CD
setopt HIST_VERIFY
setopt SHARE_HISTORY

# Useful aliases for development
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'
```

---

**🎉 With this fix, you get the best of both worlds: lightning-fast agent terminals and a beautiful, fully-featured IDE terminal experience!**

