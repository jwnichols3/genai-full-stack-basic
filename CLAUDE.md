# Claude Instructions

## Frontend Deployment

To deploy frontend changes:

```bash
source venv/bin/activate
python scripts/deploy-web.py {dev|prod}
```

**Environment Options:**

- `dev` - Deploy to development environment
- `prod` - Deploy to production environment

**Prerequisites:**

- Python virtual environment must be activated
- AWS credentials configured for profile `jnicamzn-sso-ec2`

## Development Commands

### Testing

- **Basic E2E Tests** (recommended for development): `npm run test:e2e:basic`
- **Full E2E Tests**: `npm run test:e2e`
- **Unit Tests**: Check package.json for available test commands

### Build

- Frontend: `npm run build:web`
- API: Check individual service directories

### Lint/Typecheck

- Run `npm run lint` and `npm run typecheck` if available
- Check individual workspace package.json files for specific commands
