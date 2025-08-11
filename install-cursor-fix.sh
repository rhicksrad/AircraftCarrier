#!/bin/bash

# ==========================================
# Cursor Terminal Fix Installation Script
# ==========================================

set -e

echo "🚀 Installing Cursor Terminal Fix for Powerlevel10k..."
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if zsh is installed
if ! command -v zsh &> /dev/null; then
    echo -e "${RED}❌ Error: zsh is not installed${NC}"
    echo "Please install zsh first: brew install zsh"
    exit 1
fi

# Check if Oh My Zsh is installed
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    echo -e "${RED}❌ Error: Oh My Zsh is not installed${NC}"
    echo "Please install Oh My Zsh first:"
    echo 'sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"'
    exit 1
fi

# Check if Powerlevel10k is installed
if [ ! -d "$HOME/.oh-my-zsh/custom/themes/powerlevel10k" ]; then
    echo -e "${YELLOW}⚠️  Warning: Powerlevel10k not found${NC}"
    echo "Installing Powerlevel10k..."
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
    echo -e "${GREEN}✅ Powerlevel10k installed${NC}"
fi

# Backup existing .zshrc
echo -e "${BLUE}📦 Creating backup of existing .zshrc...${NC}"
if [ -f "$HOME/.zshrc" ]; then
    cp "$HOME/.zshrc" "$HOME/.zshrc.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Backup created: ~/.zshrc.backup.$(date +%Y%m%d_%H%M%S)${NC}"
else
    echo -e "${YELLOW}⚠️  No existing .zshrc found${NC}"
fi

# Create the fixed .zshrc
echo -e "${BLUE}🔧 Creating optimized .zshrc with Cursor fix...${NC}"

cat > "$HOME/.zshrc" << 'EOF'
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

# Plugins (add more as needed)
plugins=(git)

# Add syntax highlighting and autosuggestions if available
if [ -d "$ZSH/custom/plugins/zsh-syntax-highlighting" ]; then
  plugins+=(zsh-syntax-highlighting)
fi
if [ -d "$ZSH/custom/plugins/zsh-autosuggestions" ]; then
  plugins+=(zsh-autosuggestions)
fi

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
  
  # Fast history settings
  HISTFILE=""
  SAVEHIST=0
  
  # Disable completion for speed
  setopt NO_AUTO_MENU
  setopt NO_AUTO_LIST
  
  # Agent-friendly aliases
  alias rm='rm -f'
  alias cp='cp -f' 
  alias mv='mv -f'
  alias mkdir='mkdir -p'
  alias ls='ls --color=auto'
  alias ll='ls -la'
  alias la='ls -A'
  alias l='ls -CF'
  alias ..='cd ..'
  alias ...='cd ../..'
  alias npm='npm --no-fund --no-audit --silent'
  alias yarn='yarn --non-interactive --silent'
  alias pip='pip --quiet --disable-pip-version-check'
  alias git='git -c advice.detachedHead=false -c init.defaultBranch=main'
  
  # Disable Git status for speed
  export GIT_PS1_SHOWDIRTYSTATE=false
  export GIT_PS1_SHOWSTASHSTATE=false
  export GIT_PS1_SHOWUNTRACKEDFILES=false
  export GIT_PS1_SHOWUPSTREAM=false
  
  # Minimal PATH for agents
  export PATH="/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$PATH"
  
  echo "✅ Agent configuration loaded"
else
  # Load full Powerlevel10k configuration for IDE terminal
  [[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
  
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
  alias grep='grep --color=auto'
  alias fgrep='fgrep --color=auto'
  alias egrep='egrep --color=auto'
fi

# ==========================================
# CUSTOM CONFIGURATION
# ==========================================
# Add your personal aliases, exports, and functions below this line

EOF

echo -e "${GREEN}✅ Optimized .zshrc created${NC}"

# Install recommended plugins if not present
echo -e "${BLUE}🔌 Installing recommended zsh plugins...${NC}"

if [ ! -d "$HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" ]; then
    echo "Installing zsh-syntax-highlighting..."
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
    echo -e "${GREEN}✅ zsh-syntax-highlighting installed${NC}"
fi

if [ ! -d "$HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions" ]; then
    echo "Installing zsh-autosuggestions..."
    git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions
    echo -e "${GREEN}✅ zsh-autosuggestions installed${NC}"
fi

# Update the plugins in .zshrc to include newly installed ones
sed -i.bak 's/plugins=(git)/plugins=(git zsh-syntax-highlighting zsh-autosuggestions)/' "$HOME/.zshrc"

echo
echo -e "${GREEN}🎉 Cursor Terminal Fix installed successfully!${NC}"
echo
echo -e "${CYAN}📋 What was installed:${NC}"
echo "   • Optimized .zshrc with agent detection"
echo "   • Minimal configuration for Cursor agents"
echo "   • Full Powerlevel10k theme for IDE terminal"
echo "   • Fast, non-interactive aliases for agents"
echo "   • Recommended zsh plugins"
echo
echo -e "${YELLOW}🔄 Next steps:${NC}"
echo "   1. Restart your terminal or run: source ~/.zshrc"
echo "   2. Configure Powerlevel10k if needed: p10k configure"
echo "   3. Test in Cursor agent terminal - should be fast and minimal"
echo "   4. Test in IDE terminal - should show full theme"
echo
echo -e "${BLUE}🧪 Test the fix:${NC}"
echo "   Agent test: echo \"Agent mode: \$VSCODE_SHELL_INTEGRATION\""
echo "   IDE test:   echo \"Theme: \$ZSH_THEME\""
echo
echo -e "${GREEN}✨ Enjoy your optimized terminal experience!${NC}"

