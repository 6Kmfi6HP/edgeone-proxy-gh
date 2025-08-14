# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub file acceleration proxy service built on EdgeOne Pages Functions using TypeScript. It provides accelerated access to GitHub files and repositories for both terminal tools (git clone, wget, curl) and browser downloads.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Architecture

### Core Components

1. **Functions Directory** (`functions/`)
   - `[[default]].ts`: Main request handler implementing GitHub proxy logic with URL parsing, authentication, and routing
   - `index.ts`: Root path handler that re-exports the default handler

2. **Configuration** (`edgeone.json`)
   - Controls caching (default: 600s TTL for all paths)
   - Can be extended with headers, redirects, and rewrites

### Request Flow

1. **Homepage**: GET requests to `/` return an HTML interface for browser users
2. **GitHub URL Parsing**: Extract and validate GitHub URLs from proxy format
3. **Domain Routing**: Route to appropriate GitHub domains based on content type:
   - `github.com` - Repository pages, git operations, releases
   - `raw.githubusercontent.com` - Raw file content
   - `codeload.github.com` - Archive downloads (zip/tar.gz)
   - `gist.github.com` / `gist.githubusercontent.com` - Gist content
4. **Authentication**: Handle Personal Access Tokens for private repositories
5. **Response Processing**: Add CORS headers, handle file downloads with proper Content-Disposition

### Key Implementation Details

- **URL Formats Supported**: 
  - Direct GitHub URLs in path: `/https://github.com/user/repo`
  - Authentication URLs: `/https://user:token@github.com/user/repo`
- **Git Clone Support**: Special handling for `.git` paths and git protocol endpoints
- **Private Repository Access**: Extracts and converts user:token to Authorization header
- **Error Handling**: Returns structured JSON errors with request details
- **CORS**: Full CORS support for browser and API access
- **File Downloads**: Sets appropriate Content-Disposition headers for downloads

### Supported GitHub Domains

The proxy validates and routes to these GitHub domains:
- `github.com` - Main repository interface
- `raw.githubusercontent.com` - Raw file content
- `gist.github.com` - Gist pages
- `gist.githubusercontent.com` - Raw gist content
- `codeload.github.com` - Source archives
- `objects.githubusercontent.com` - Git objects

### Usage Examples

Terminal commands that work with this proxy:
```bash
# Git clone
git clone https://your-domain.com/https://github.com/user/repo.git

# Private repo with token
git clone https://user:token@your-domain.com/https://github.com/user/private-repo.git

# Download files
wget https://your-domain.com/https://github.com/user/repo/archive/master.zip
curl -O https://your-domain.com/https://raw.githubusercontent.com/user/repo/main/file.txt
```

## Deployment

EdgeOne supports direct `.ts` deployment without compilation. Upload the `functions/` folder and `edgeone.json` to deploy.

## Important Security Notes

- Only supports HTTPS git clone (no SSH keys)
- Private repository access requires Personal Access Tokens
- All authentication tokens are passed through Authorization headers
- No token storage or logging

## Documentation Links

- Routing & API: https://edgeone.ai/document/162227908259442688
- Fetch API: https://edgeone.ai/document/52687
- edgeone.json Configuration: https://edgeone.ai/document/162316940304400384