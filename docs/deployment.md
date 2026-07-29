# Docker deployment

## GitHub Actions

The workflow at `.github/workflows/docker.yml` builds the Vite app and publishes an image to GitHub Container Registry (GHCR).

- Push to `main`: build, publish `ghcr.io/pwj2333/aipowertest:latest`, then deploy when the server secrets exist.
- Push a `v*.*.*` tag: build and publish a versioned image.
- Use **Actions > Build and deploy Docker image > Run workflow** for a manual build. The `deploy` switch controls whether the SSH deployment runs.

## Repository secrets

Add these secrets in **Settings > Secrets and variables > Actions**:

| Secret | Required | Description |
| --- | --- | --- |
| `DEPLOY_HOST` | for deployment | Public hostname or IP of the Docker server |
| `DEPLOY_USER` | for deployment | SSH user with permission to run Docker |
| `DEPLOY_SSH_KEY` | for deployment | Private key for that SSH user (OpenSSH format) |
| `DEPLOY_PORT` | optional | SSH port; defaults to `22` |
| `GHCR_USERNAME` | for private image | GitHub username used by the server to log in to GHCR |
| `GHCR_TOKEN` | for private image | Fine-grained PAT with package read access |
| `ADMIN_PASSWORD` | recommended | Administrator password; defaults to `admin123` when omitted |

`GHCR_USERNAME` and `GHCR_TOKEN` can be omitted when the image is public. For a private package, create a read-only PAT and configure both values.

## Server prerequisites

Install Docker and make sure the deploy user can run `docker` without `sudo`. Open the application port (default `80`) and the SSH port in the firewall. The action replaces a container named `ai-power-test`, maps host port `80` to container port `3000`, and mounts the named volume `ai-power-test-data` at `/app/data`.

To use another host port, change `APP_PORT` in the workflow before pushing.

Application data is stored in `/app/data/assessment.json`. Back up the `ai-power-test-data` volume regularly. Do not remove that volume during deployment and do not run multiple containers against the same JSON file.

Set `ADMIN_PASSWORD` before exposing the application. The built-in default is intended only for the first local login.

## Local checks

```bash
npm ci
npm run test:run
npm run build
docker build -t ai-power-test:local .
docker run --rm -p 8080:3000 -e ADMIN_PASSWORD='replace-this-password' -v ai-power-test-data:/app/data ai-power-test:local
```

