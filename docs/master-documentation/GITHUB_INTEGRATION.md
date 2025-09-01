# 🐙 LOUMASS GitHub Integration Guide

## 📋 Overview

This document covers the complete GitHub integration for LOUMASS, including repository setup, branch management, automated workflows, security configurations, and collaboration practices. Essential for maintaining development workflows and deployment automation.

---

## 🏗️ Repository Configuration

### Repository Details
- **Repository Name**: `loumass_beta`
- **Owner**: `louispiotti`
- **Visibility**: Private
- **Default Branch**: `main`
- **Repository URL**: `https://github.com/louispiotti/loumass_beta`
- **Clone URL**: `git@github.com:louispiotti/loumass_beta.git`

### Repository Structure
```
loumass_beta/
├── .github/                 # GitHub workflows and templates
│   ├── workflows/          # GitHub Actions workflows
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
├── src/                    # Source code
├── docs/                   # Documentation
├── prisma/                 # Database schema
├── public/                 # Static assets
├── .env.example           # Environment variable template
├── .gitignore             # Git ignore rules
├── package.json           # Dependencies and scripts
├── README.md              # Project overview
└── vercel.json           # Vercel configuration
```

### Branch Strategy
- **Production**: `main` branch
- **Development**: `develop` branch (optional)
- **Feature Branches**: `feature/feature-name`
- **Hotfix Branches**: `hotfix/issue-description`
- **Release Branches**: `release/v1.x.x`

---

## 🔧 Git Configuration

### Local Git Setup

#### Initial Repository Setup
```bash
# Clone repository
git clone git@github.com:louispiotti/loumass_beta.git
cd loumass_beta

# Set up user configuration
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set up remote tracking
git branch --set-upstream-to=origin/main main

# Verify configuration
git config --list --local
```

#### Branch Management
```bash
# Create and switch to feature branch
git checkout -b feature/new-feature

# Push feature branch to remote
git push -u origin feature/new-feature

# Switch back to main
git checkout main

# Update main branch
git pull origin main

# Delete local branch after merge
git branch -d feature/new-feature

# Delete remote branch
git push origin --delete feature/new-feature
```

### Git Workflow

#### Development Workflow
1. **Create Feature Branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/sequence-builder-improvements
   ```

2. **Make Changes**:
   ```bash
   # Make your changes
   git add .
   git commit -m "feat: improve sequence builder UX
   
   - Fix input visibility issues
   - Add better error handling
   - Improve mobile responsiveness"
   ```

3. **Push and Create PR**:
   ```bash
   git push -u origin feature/sequence-builder-improvements
   # Create PR via GitHub UI or CLI
   ```

4. **After PR Merge**:
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/sequence-builder-improvements
   ```

#### Commit Message Convention
```bash
# Format: type(scope): description
#
# Types: feat, fix, docs, style, refactor, perf, test, chore
# Scope: component or feature area (optional)
# Description: what this commit does

# Examples:
git commit -m "feat(auth): add Google OAuth integration"
git commit -m "fix(ui): resolve white text visibility issue"
git commit -m "docs: update API documentation"
git commit -m "refactor(database): optimize sequence queries"
git commit -m "test(sequences): add unit tests for sequence builder"
```

---

## 🔄 GitHub Actions & CI/CD

### Automated Workflows

#### Main Workflow (.github/workflows/main.yml)
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  # Quality checks
  quality:
    runs-on: ubuntu-latest
    name: Code Quality
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint code
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Test
        run: npm run test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

  # Security scanning
  security:
    runs-on: ubuntu-latest
    name: Security Scan
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Audit dependencies
        run: npm audit --audit-level high

  # Build and deploy
  deploy:
    needs: [quality, security]
    runs-on: ubuntu-latest
    name: Deploy to Vercel
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

#### Database Migration Workflow
```yaml
name: Database Migration

on:
  push:
    paths:
      - 'prisma/schema.prisma'
      - 'prisma/migrations/**'
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    name: Run Database Migrations
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Generate Prisma client
        run: npx prisma generate
```

#### Dependency Updates
```yaml
name: Update Dependencies

on:
  schedule:
    - cron: '0 0 * * MON'  # Weekly on Monday
  workflow_dispatch:       # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    name: Update Dependencies
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Update dependencies
        run: |
          npx npm-check-updates -u
          npm install

      - name: Run tests
        run: npm test

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: update dependencies'
          title: 'chore: update dependencies'
          body: 'Automated dependency update'
          branch: 'chore/update-dependencies'
```

---

## 🔐 Security Configuration

### Repository Security Settings

#### Branch Protection Rules
```json
{
  "main": {
    "required_status_checks": {
      "strict": true,
      "contexts": ["quality", "security"]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false
    },
    "restrictions": null,
    "allow_force_pushes": false,
    "allow_deletions": false
  }
}
```

#### Secrets Management
```bash
# Repository Secrets (GitHub Settings → Secrets and variables → Actions)
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
DATABASE_URL=production-database-url
TEST_DATABASE_URL=test-database-url
SNYK_TOKEN=your-snyk-token
```

#### Security Policies

##### .github/SECURITY.md
```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities to security@loumass.com

DO NOT create public GitHub issues for security vulnerabilities.

### Process
1. Email details to security@loumass.com
2. We'll acknowledge within 24 hours
3. We'll provide a timeline for the fix
4. We'll coordinate disclosure after fix

## Security Best Practices

- All dependencies are regularly updated
- Automated security scanning with Snyk
- Regular security audits
- Secure environment variable handling
```

### Code Scanning & Analysis

#### CodeQL Analysis
```yaml
name: CodeQL Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 1'  # Weekly

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'typescript']

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

#### Dependabot Configuration
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 5
    reviewers:
      - "louispiotti"
    assignees:
      - "louispiotti"
    commit-message:
      prefix: "deps"
      include: "scope"
  
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## 📝 Issue & PR Templates

### Issue Templates

#### Bug Report Template (.github/ISSUE_TEMPLATE/bug_report.yml)
```yaml
name: Bug Report
description: File a bug report to help us improve
title: "[Bug]: "
labels: ["bug", "needs-triage"]

body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!

  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: A clear description of what the bug is
      placeholder: Tell us what you see!
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      description: Steps to reproduce the behavior
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What you expected to happen
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: |
        - OS: [e.g. macOS, Windows, Linux]
        - Browser: [e.g. Chrome, Firefox, Safari]
        - Version: [e.g. 91.0.4472.124]
      value: |
        - OS: 
        - Browser: 
        - Version: 
    validations:
      required: true
```

#### Feature Request Template
```yaml
name: Feature Request
description: Suggest an idea for LOUMASS
title: "[Feature]: "
labels: ["enhancement", "needs-triage"]

body:
  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem does this solve?
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: What would you like to happen?
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives
      description: Any alternative solutions or features?

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Screenshots, mockups, or other context
```

### Pull Request Template

#### .github/PULL_REQUEST_TEMPLATE.md
```markdown
## Description

Brief description of the changes in this PR.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes, no api changes)
- [ ] Performance improvement
- [ ] Test coverage improvement

## Changes Made

- List the specific changes made
- Use bullet points for clarity
- Include any breaking changes

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Screenshots/videos attached (if UI changes)

## Database Changes

- [ ] No database changes
- [ ] Migration scripts included
- [ ] Migration tested locally
- [ ] Migration tested on staging

## Deployment Notes

- [ ] No special deployment steps required
- [ ] Environment variables need updating
- [ ] Third-party services need configuration
- [ ] Documentation needs updating

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is properly commented
- [ ] Tests added/updated as needed
- [ ] Documentation updated
- [ ] No console.log statements left in code
- [ ] TypeScript errors resolved

## Screenshots/Videos

<!-- Add screenshots or videos if applicable -->

## Related Issues

Closes #<issue_number>
```

---

## 🤝 Collaboration Workflow

### Team Roles & Permissions

#### Repository Access Levels
```
Admin (louispiotti):
- Full repository access
- Manage settings and secrets
- Merge to protected branches

Maintainer:
- Push to repository
- Manage issues and PRs
- Cannot modify settings

Developer:
- Fork and create PRs
- Comment on issues/PRs
- Cannot push directly to main
```

#### Code Review Process
1. **Create Feature Branch**: Developer creates branch from main
2. **Development**: Make changes with proper commit messages
3. **Create PR**: Open PR with detailed description
4. **Code Review**: At least one approval required
5. **CI/CD Checks**: All automated checks must pass
6. **Merge**: Squash and merge to main
7. **Cleanup**: Delete feature branch

### Communication Guidelines

#### PR Review Guidelines
```markdown
## Review Checklist

### Code Quality
- [ ] Code is readable and well-documented
- [ ] Follows project conventions
- [ ] No obvious bugs or security issues
- [ ] Performance implications considered

### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful and not brittle
- [ ] Manual testing if needed

### Documentation
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Code comments are helpful

### Security
- [ ] No secrets or sensitive data exposed
- [ ] Input validation where appropriate
- [ ] Authentication/authorization correct
```

#### Issue Management
```
Labels:
- bug: Something isn't working
- enhancement: New feature or request
- documentation: Improvements or additions to docs
- good first issue: Good for newcomers
- help wanted: Extra attention is needed
- invalid: This doesn't seem right
- question: Further information is requested
- wontfix: This will not be worked on
- priority-high: High priority issue
- priority-medium: Medium priority issue
- priority-low: Low priority issue
```

---

## 📊 Repository Analytics

### Insights & Metrics

#### Repository Health
- **Commit Activity**: Regular commits indicate active development
- **Pull Requests**: Ratio of open/closed PRs
- **Issues**: Issue resolution time and backlog
- **Contributors**: Number of active contributors
- **Code Frequency**: Lines added/removed over time

#### Automated Reporting
```yaml
name: Repository Report

on:
  schedule:
    - cron: '0 9 * * MON'  # Weekly Monday 9 AM

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Repository Report
        uses: actions/github-script@v7
        with:
          script: |
            const { data: prs } = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'all',
              per_page: 100
            });
            
            const openPrs = prs.filter(pr => pr.state === 'open');
            const closedPrs = prs.filter(pr => pr.state === 'closed');
            
            console.log(`Open PRs: ${openPrs.length}`);
            console.log(`Closed PRs: ${closedPrs.length}`);
            
            // Send to Slack or email if configured
```

---

## 🚨 Troubleshooting

### Common Git Issues

#### Merge Conflicts
```bash
# When merge conflict occurs
git status                    # Check conflicted files
# Edit files to resolve conflicts
git add .                     # Stage resolved files
git commit -m "resolve merge conflicts"
git push origin feature-branch
```

#### Accidental Commits
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Amend last commit message
git commit --amend -m "New commit message"
```

#### Branch Issues
```bash
# Rename current branch
git branch -m new-branch-name

# Delete local branch
git branch -D branch-name

# Track remote branch
git branch --set-upstream-to=origin/main main
```

### GitHub Actions Debugging

#### Workflow Failures
```yaml
# Add debug step to workflow
- name: Debug Info
  run: |
    echo "Event: ${{ github.event_name }}"
    echo "Ref: ${{ github.ref }}"
    echo "SHA: ${{ github.sha }}"
    env | grep GITHUB
```

#### Secret Access Issues
```bash
# Verify secrets are set in repository settings
# Check secret names match exactly in workflow
# Ensure workflow has proper permissions
```

### Performance Issues

#### Large Repository Cleanup
```bash
# Remove large files from history
git filter-branch --tree-filter 'rm -rf path/to/large/files' HEAD

# Alternative using BFG repo cleaner
java -jar bfg.jar --delete-files "*.zip" my-repo.git
```

---

## 📚 Best Practices

### Git Best Practices
1. **Commit Often**: Small, focused commits
2. **Clear Messages**: Descriptive commit messages
3. **Branch Naming**: Use consistent naming conventions
4. **Pull Before Push**: Always pull latest changes first
5. **Review Changes**: Review your own changes before committing

### GitHub Workflow Best Practices
1. **Protected Branches**: Protect main branch
2. **Required Reviews**: Require code reviews
3. **Status Checks**: Require CI/CD to pass
4. **Automated Testing**: Comprehensive test coverage
5. **Documentation**: Keep documentation updated

### Security Best Practices
1. **Secret Management**: Never commit secrets
2. **Access Control**: Minimal required permissions
3. **Regular Updates**: Keep dependencies updated
4. **Security Scanning**: Automated vulnerability scanning
5. **Branch Protection**: Protect important branches

---

## 🔄 Maintenance Tasks

### Weekly Tasks
- [ ] Review open PRs and issues
- [ ] Check CI/CD workflow health
- [ ] Review dependency updates
- [ ] Update project board/milestones

### Monthly Tasks
- [ ] Repository cleanup (merged branches)
- [ ] Security audit and updates
- [ ] Performance review
- [ ] Documentation updates
- [ ] Team access review

### Quarterly Tasks
- [ ] Major dependency updates
- [ ] Workflow optimization
- [ ] Security policy review
- [ ] Backup and disaster recovery testing
- [ ] Team process improvements

---

**Last Updated**: January 2025  
**Repository Status**: Active development  
**Main Contributors**: louispiotti  
**Next Review**: February 2025