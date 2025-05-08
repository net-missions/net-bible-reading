# Git Protocol for Net Bible Reading

This document outlines the standardized Git protocol for the Net Bible Reading project. The protocol simplifies common Git operations and handles authentication issues automatically.

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/net-missions/net-bible-reading.git
   cd net-bible-reading
   ```

2. Run the setup command to configure your Git credentials and authentication:
   ```bash
   ./git-protocol.sh setup
   ```
   Follow the prompts to set up either:
   - HTTPS authentication with a Personal Access Token (recommended)
   - SSH authentication

## Common Commands

### Checking Status
To check the status of your repository:
```bash
./git-protocol.sh status
```

### Making Changes
To stage and commit your changes:
```bash
./git-protocol.sh write "Your commit message here"
```

### Pushing Changes
To push your committed changes to GitHub:
```bash
./git-protocol.sh push
```

### Pulling Changes
To pull the latest changes from GitHub:
```bash
./git-protocol.sh pull
```

### Syncing Changes
To synchronize your local repository with GitHub (pull then push):
```bash
./git-protocol.sh sync
```

### Working with Branches
To switch to a different branch:
```bash
./git-protocol.sh switch branch-name
```

To create a new branch:
```bash
./git-protocol.sh branch new-branch-name
```

## Troubleshooting

If you encounter permission or authentication issues:

1. Run the setup again:
   ```bash
   ./git-protocol.sh setup
   ```

2. For HTTPS authentication issues:
   - Ensure your Personal Access Token has the correct permissions (at least `repo` scope)
   - Check that your username is correct

3. For SSH authentication issues:
   - Verify your SSH key is added to your GitHub account
   - Check SSH agent is running with `ssh-add -l`

## Best Practices

1. Always pull before pushing to avoid conflicts:
   ```bash
   ./git-protocol.sh pull
   ```
   Or use the sync command:
   ```bash
   ./git-protocol.sh sync
   ```

2. Write meaningful commit messages:
   ```bash
   ./git-protocol.sh write "Fix mobile navigation styling and route paths"
   ```

3. Create feature branches for new features:
   ```bash
   ./git-protocol.sh branch feature/new-feature-name
   ```

4. Review changes before committing:
   ```bash
   ./git-protocol.sh status
   ``` 