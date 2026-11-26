# Contributing to Packistry

Thanks for your interest in contributing! This guide covers running Packistry locally for
development and the checks your pull request needs to pass. To run Packistry in production, see
the [installation docs](https://packistryphp.com/docs/installation) instead.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Docker Compose v2

Everything else (PHP, Composer, Node.js, pnpm, MySQL) runs in containers. A local PHP 8.4+ and
Node.js with pnpm 10 are optional, for IDE tooling only.

## Local development stack

The dev stack is `docker-compose.yml` plus the `docker-compose.dev.yml` override:

| Service    | What it does                                               | URL / port                         |
|------------|------------------------------------------------------------|------------------------------------|
| `web`      | Laravel API (`php artisan serve`), runs migrations on boot | `http://localhost:${APP_PORT:-80}` |
| `worker`   | Queue worker (package imports, upstream mirroring)         | -                                  |
| `frontend` | Vite dev server with hot reload, proxies `/api` to `web`   | `http://localhost:5173`            |
| `database` | MySQL 8                                                    | `${FORWARD_DB_PORT:-3306}`         |

### First run

1. Create your `.env` and an app key:

   ```shell
   cp .env.example .env
   sed -i.bak "s|^APP_KEY=.*|APP_KEY=base64:$(openssl rand -base64 32)|" .env && rm .env.bak
   ```

2. Start the stack. Both compose files have to be passed:

   ```shell
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

   To avoid typing that every time, add this line to your `.env`, after which a plain
   `docker compose ...` picks up both files (all commands below assume it):

   ```dotenv
   COMPOSE_FILE=docker-compose.yml:docker-compose.dev.yml
   ```

   The first start takes a few minutes: `web` runs `composer install` and the migrations, and
   `frontend` runs `pnpm install`. `docker compose ps` shows `web` as `healthy` once it is ready.

   If port 80 is already taken on your machine, set e.g. `APP_PORT=8080` in `.env`.

3. Seed the database. The seeder asks for the admin's email, name and password, creates the
   admin and the root repository, and optionally an API token. Run it once, on an empty database:

   ```shell
   docker compose exec web php artisan db:seed
   ```

   Add more users later with:

   ```shell
   docker compose exec web php artisan add:user
   ```

4. Open **http://localhost:5173** and log in. Use the Vite URL, not the `web` port: the API
   serves the UI only from a production build (`public/index.html`), which the dev stack does
   not create.

Code changes are picked up automatically: PHP on the next request, the frontend through hot
reload. Restart the worker after changing job code: `docker compose restart worker`.

Stop the stack with `docker compose down`; add `-v` to also drop the database.

## Tests and code style

These are the checks CI runs on every pull request:

```shell
# Backend
docker compose exec web ./vendor/bin/pest --parallel
docker compose exec web ./vendor/bin/pint --test
docker compose exec web ./vendor/bin/phpstan analyse --memory-limit=2G

# Frontend
docker compose exec frontend pnpm eslint
docker compose exec frontend pnpm check-types
docker compose exec frontend pnpm prettier
```

`pint` without `--test` fixes the style issues it finds. `pnpm prettier` formats files in place.

Tests use an in-memory SQLite database (see `phpunit.xml.dist`), so they do not touch your dev
database. CI additionally runs the test suite against MySQL and PostgreSQL.

## Good to know

- **Webhooks** from GitHub, GitLab, Gitea or Bitbucket cannot reach `localhost`. Use a tunnel
  (e.g. ngrok or cloudflared) to test them.
- **Testing Composer against your local instance:** Composer talks to the `web` port, not
  Vite, and refuses plain HTTP by default. In a throwaway test project run
  `composer config secure-http false` and
  `composer config repositories.packistry composer http://localhost:${APP_PORT}` (append
  `/r/<path>` for a non-root repository). Never disable `secure-http` outside local development.
- **PHP version:** CI and the Docker image use PHP 8.5.
- **Linux hosts:** files created inside the containers (`vendor/`, `storage/`,
  `bootstrap/cache/`, the generated `frontend/src/routeTree.gen.ts`) are owned by root. Fix with
  `sudo chown -R "$USER" vendor storage bootstrap/cache frontend/src` (repeat when needed).
- **Running Vite on the host** instead of in Docker: point the proxy at the API port, e.g.
  `cd frontend && VITE_API_PROXY=http://localhost:8080 pnpm dev`. Without `VITE_API_PROXY` the
  proxy targets `http://localhost`.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make your change, with tests for new backend behaviour.
3. Make sure the checks above pass.
4. Open a pull request against `packistry/packistry:main` describing what changed and why.

Found a security issue? Please follow [SECURITY.md](./SECURITY.md) instead of opening a public
issue.
