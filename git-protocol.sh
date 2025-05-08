#!/bin/bash

# Git Protocol Script for Net Bible Reading project
# This script provides standardized commands for working with GitHub

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
show_usage() {
  echo -e "${BLUE}Git Protocol Script${NC}"
  echo "Usage: ./git-protocol.sh [command]"
  echo ""
  echo "Commands:"
  echo "  setup              - Configure Git credentials and SSH (first-time setup)"
  echo "  status             - Check Git status"
  echo "  write [message]    - Stage and commit changes with a message"
  echo "  push               - Push changes to GitHub"
  echo "  pull               - Pull latest changes from GitHub"
  echo "  sync               - Pull then push (sync local with remote)"
  echo "  switch [branch]    - Switch to a different branch"
  echo "  branch [name]      - Create a new branch"
}

# Function to set up Git configuration
setup_git() {
  echo -e "${BLUE}Setting up Git configuration...${NC}"
  
  # Check if git is installed
  if ! command -v git &> /dev/null; then
    echo -e "${RED}Git is not installed. Please install Git first.${NC}"
    exit 1
  fi
  
  # Configure Git user
  read -p "Enter your Git username: " username
  read -p "Enter your Git email: " email
  
  git config --global user.name "$username"
  git config --global user.email "$email"
  
  echo -e "${GREEN}Git user configured successfully.${NC}"
  
  # Ask for authentication method
  echo "Choose authentication method:"
  echo "1. HTTPS with Personal Access Token (recommended)"
  echo "2. SSH"
  read -p "Enter choice (1/2): " auth_choice
  
  if [ "$auth_choice" == "1" ]; then
    echo -e "${YELLOW}You'll need to create a Personal Access Token (PAT) on GitHub:${NC}"
    echo "1. Go to GitHub → Settings → Developer settings → Personal access tokens"
    echo "2. Generate a new token with 'repo' permissions"
    read -p "Have you created a token? (y/n): " token_created
    
    if [ "$token_created" == "y" ]; then
      read -p "Enter your GitHub username: " gh_username
      read -sp "Enter your Personal Access Token: " token
      echo
      
      # Store credentials
      git config --global credential.helper store
      
      # Test authentication
      echo -e "${BLUE}Testing GitHub authentication...${NC}"
      echo "https://$gh_username:$token@github.com" > ~/.git-credentials
      chmod 600 ~/.git-credentials
      
      echo -e "${GREEN}Credentials stored. You may be prompted for credentials on first push.${NC}"
    else
      echo -e "${YELLOW}Please create a token and run setup again.${NC}"
    fi
  elif [ "$auth_choice" == "2" ]; then
    echo -e "${BLUE}Setting up SSH for GitHub...${NC}"
    
    # Check if SSH key exists
    if [ ! -f ~/.ssh/id_ed25519 ]; then
      echo "Generating new SSH key..."
      ssh-keygen -t ed25519 -C "$email"
      
      # Start ssh-agent and add key
      eval "$(ssh-agent -s)"
      ssh-add ~/.ssh/id_ed25519
    else
      echo "SSH key already exists at ~/.ssh/id_ed25519"
    fi
    
    # Display public key
    echo -e "${YELLOW}Add this public key to your GitHub account:${NC}"
    cat ~/.ssh/id_ed25519.pub
    echo
    echo "1. Go to GitHub → Settings → SSH and GPG keys → New SSH key"
    echo "2. Paste the key above and save"
    
    read -p "Press Enter after adding the key to GitHub..."
    
    # Update remote URL to use SSH
    current_url=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ $current_url == https://* ]]; then
      ssh_url=$(echo $current_url | sed 's|https://github.com/|git@github.com:|')
      git remote set-url origin "$ssh_url"
      echo -e "${GREEN}Remote URL updated to use SSH: $ssh_url${NC}"
    fi
    
    # Test SSH connection
    echo -e "${BLUE}Testing SSH connection to GitHub...${NC}"
    ssh -T git@github.com
  else
    echo -e "${RED}Invalid choice.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}Git setup completed.${NC}"
}

# Function to check git status
check_status() {
  echo -e "${BLUE}Checking Git status...${NC}"
  git status
}

# Function to write changes (stage and commit)
write_changes() {
  message="$1"
  
  if [ -z "$message" ]; then
    echo -e "${RED}Commit message is required.${NC}"
    echo "Usage: ./git-protocol.sh write \"Your commit message\""
    exit 1
  fi
  
  echo -e "${BLUE}Staging all changes...${NC}"
  git add .
  
  echo -e "${BLUE}Committing changes with message:${NC} $message"
  git commit -m "$message"
  
  echo -e "${GREEN}Changes committed successfully.${NC}"
}

# Function to push changes
push_changes() {
  echo -e "${BLUE}Pushing changes to GitHub...${NC}"
  
  # Get current branch
  current_branch=$(git branch --show-current)
  
  # Push to remote
  push_result=$(git push origin "$current_branch" 2>&1)
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Changes pushed successfully to $current_branch.${NC}"
  else
    echo -e "${RED}Failed to push changes.${NC}"
    echo "$push_result"
    
    if [[ "$push_result" == *"403"* ]]; then
      echo -e "${YELLOW}Authentication issue detected. Run './git-protocol.sh setup' to configure credentials.${NC}"
    fi
    
    exit 1
  fi
}

# Function to pull changes
pull_changes() {
  echo -e "${BLUE}Pulling latest changes from GitHub...${NC}"
  
  # Get current branch
  current_branch=$(git branch --show-current)
  
  # Pull from remote
  pull_result=$(git pull origin "$current_branch" 2>&1)
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Latest changes pulled successfully from $current_branch.${NC}"
  else
    echo -e "${RED}Failed to pull changes.${NC}"
    echo "$pull_result"
    exit 1
  fi
}

# Function to sync (pull then push)
sync_changes() {
  pull_changes
  push_changes
}

# Function to switch branches
switch_branch() {
  branch="$1"
  
  if [ -z "$branch" ]; then
    echo -e "${RED}Branch name is required.${NC}"
    echo "Usage: ./git-protocol.sh switch [branch-name]"
    exit 1
  fi
  
  echo -e "${BLUE}Switching to branch: $branch${NC}"
  git checkout "$branch"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Switched to branch: $branch${NC}"
  else
    echo -e "${RED}Failed to switch to branch: $branch${NC}"
    echo -e "${YELLOW}Branch may not exist. Create it with: ./git-protocol.sh branch $branch${NC}"
    exit 1
  fi
}

# Function to create a new branch
create_branch() {
  branch="$1"
  
  if [ -z "$branch" ]; then
    echo -e "${RED}Branch name is required.${NC}"
    echo "Usage: ./git-protocol.sh branch [branch-name]"
    exit 1
  fi
  
  echo -e "${BLUE}Creating new branch: $branch${NC}"
  git checkout -b "$branch"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Created and switched to new branch: $branch${NC}"
  else
    echo -e "${RED}Failed to create branch: $branch${NC}"
    exit 1
  fi
}

# Main script logic
command="$1"
shift

case "$command" in
  "setup")
    setup_git
    ;;
  "status")
    check_status
    ;;
  "write")
    write_changes "$1"
    ;;
  "push")
    push_changes
    ;;
  "pull")
    pull_changes
    ;;
  "sync")
    sync_changes
    ;;
  "switch")
    switch_branch "$1"
    ;;
  "branch")
    create_branch "$1"
    ;;
  *)
    show_usage
    ;;
esac

exit 0 