# 🚀 Cursor Terminal Fix - Quick Setup Guide

## 🎯 Problem Solved
This fix prevents Powerlevel10k from hanging Cursor AI agent terminals while keeping the full beautiful theme in your IDE terminal.

## ⚡ Quick Installation

### Option 1: Automatic Installation (Linux/macOS)
```bash
# Download and run the installer
curl -fsSL https://raw.githubusercontent.com/your-repo/cursor-fix/main/install-cursor-fix.sh | bash
```

### Option 2: Manual Installation (All Platforms)

#### 1. Backup Your Current .zshrc
```bash
cp ~/.zshrc ~/.zshrc.backup
```

#### 2. Edit Your .zshrc
Add this detection at the **TOP** of your `~/.zshrc` file:

```bash
# CURSOR AGENT TERMINAL FIX
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  POWERLEVEL9K_INSTANT_PROMPT=off
  export DEBIAN_FRONTEND=noninteractive
  export NONINTERACTIVE=1
  echo "🤖 Agent terminal detected"
fi
```

#### 3. Modify Theme Selection
Replace your `ZSH_THEME` line with:

```bash
# Theme selection
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  ZSH_THEME=""  # No theme for agents
else
  ZSH_THEME="powerlevel10k/powerlevel10k"  # Full theme for IDE
fi
```

#### 4. Add Agent Configuration
Add this **AFTER** `source $ZSH/oh-my-zsh.sh`:

```bash
# Agent-specific config
if [[ -n "$VSCODE_SHELL_INTEGRATION" ]]; then
  PROMPT='%F{cyan}%n@%m%f:%F{yellow}%~%f%# '
  RPROMPT=''
  unsetopt CORRECT CORRECT_ALL AUTO_CD
  setopt NO_BEEP NO_HIST_BEEP NO_LIST_BEEP
  
  # Fast aliases
  alias rm='rm -f'
  alias cp='cp -f'
  alias mv='mv -f'
  alias npm='npm --silent'
  alias git='git -c advice.detachedHead=false'
  
  echo "✅ Agent config loaded"
else
  [[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
fi
```

## 🧪 Testing

### Test Agent Terminal (in Cursor)
```bash
echo "Agent mode: $VSCODE_SHELL_INTEGRATION"
# Should show: Agent mode: 1
```

### Test IDE Terminal (in Cursor's built-in terminal)
```bash
echo "Theme: $ZSH_THEME" 
# Should show: Theme: powerlevel10k/powerlevel10k
```

## 📋 Complete Example .zshrc

See `cursor-terminal-fix.md` for a complete working example.

## ✅ Results

- ⚡ **Agent Terminals**: Fast, minimal, no hangs
- 🎨 **IDE Terminal**: Full Powerlevel10k theme
- 🔧 **Zero Conflicts**: Clean separation of concerns

## 🆘 Troubleshooting

### Still getting hangs?
Check if instant prompt is disabled:
```bash
echo $POWERLEVEL9K_INSTANT_PROMPT
# Should show: off (in agent terminal)
```

### No theme in IDE?
Verify Powerlevel10k installation:
```bash
ls ~/.oh-my-zsh/custom/themes/powerlevel10k
```

### Need to reset?
```bash
cp ~/.zshrc.backup ~/.zshrc
source ~/.zshrc
```

---

**🎉 Enjoy fast agent terminals and beautiful IDE terminals!**

