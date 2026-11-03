# fullstack_developer_capstone

Repository name: `xrwvm-fullstack_developer_capstone`

Project name: `fullstack_developer_capstone`

Application: **Best Cars — dealership reviews**

An educational dealership portal based on the IBM Skills Network starter. Anonymous
visitors browse 50 branches, filter by state, and read reviews. Registered users
publish reviews with optional purchase details. Administrators manage car makes/models.

## Architecture

- React 18 + Vite: responsive directory, filters, accounts, reviews.
- Django 5.2 + SQLite: session authentication, CSRF protection, validation, admin,
  relational car makes/models, and an API gateway.
- Node/Express + MongoDB: dealer/review persistence; seed data is loaded only into
  empty collections. Reviews survive a local service restart.
- Flask + NLTK VADER: positive/neutral/negative sentiment analysis.
- Docker Compose, Kubernetes templates, and GitHub Actions CI.

Only Django should be exposed externally; Node, Flask, and MongoDB are internal
services. Review author identity is taken from the authenticated server session.

## Run locally on Windows

Prerequisites: Python 3.12 and Node.js 24. From the repository root:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r server/requirements.txt
Push-Location server/frontend
npm.cmd ci
npm.cmd run build
Pop-Location
Push-Location server/database
npm.cmd ci
Pop-Location
./scripts/start-local.ps1
```

Open `http://127.0.0.1:8000`. The launcher migrates SQLite, imports 5 car makes and
110 models, and starts the web, dealer, and sentiment services. Local MongoDB runs
through `mongodb-memory-server` using the official MongoDB binary and a persistent
project-local data directory. Deployment uses `MONGO_URL` instead.

Local-only `root` and `reviewer` passwords are randomly generated into the
git-ignored `.local-credentials.json`. The setup script never replaces an existing
password. `.env`, databases, node_modules, cookie jars, credentials, and evidence
are excluded from git. Logs and the launched process IDs are under `evidence/`.

With Docker installed, `docker compose up --build` starts the four services. The
development Compose configuration exposes only `127.0.0.1:8000`. It does not expose
MongoDB, Node, or Flask ports. SQLite in this Compose configuration lives in the
web container; use a persistent volume for accounts that must survive replacement.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Random private secret; required with debug disabled |
| `DJANGO_DEBUG` | Local `true`; HTTPS deployment `false` |
| `ALLOWED_HOSTS` | Comma-separated hostnames without schemes |
| `CSRF_TRUSTED_ORIGINS` | Trusted HTTPS origins |
| `BACKEND_URL` | Local default `http://127.0.0.1:3030` |
| `SENTIMENT_URL` | Local default `http://127.0.0.1:5050` |
| `MONGO_URL` | Dealer service MongoDB connection URI |
| `SQLITE_PATH` | Optional persistent SQLite path |

`deploy/kubernetes.yaml` requires your registry image names and an existing
`bestcars-secrets` Secret. Configure the isolated lab's HTTPS route to the web
service. Keep internal services private. No real cloud deployment is implied by
the presence of a template.

## API

State changes require a CSRF cookie and matching `X-CSRFToken` header. First call
`GET /djangoapp/session` with a cookie jar. The CSRF token rotates after login.

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/djangoapp/session` | Session and CSRF cookie |
| POST | `/djangoapp/register` | Five-field validated registration |
| POST | `/djangoapp/login` | `userName` and `password` login |
| POST | `/djangoapp/logout` | End the current session |
| GET | `/djangoapp/get_dealers` | All branches |
| GET | `/djangoapp/get_dealers/Kansas` | Kansas branches |
| GET | `/djangoapp/dealer/1` | One dealer |
| GET | `/djangoapp/reviews/dealer/17` | Reviews with sentiment |
| GET | `/djangoapp/get_cars` | Relational makes and models |
| POST | `/djangoapp/add_review` | Create review as session user |
| GET | `http://127.0.0.1:5050/analyze/Fantastic%20services` | Sentiment |

`scripts/capture_curl.py` executes real cURL requests and preserves commands and
outputs. It references a private login payload and renders the rotating CSRF
header as `$CSRF_TOKEN`. Cookie jars and payloads must remain private.

## Validation

```powershell
.venv/Scripts/python.exe server/manage.py check
.venv/Scripts/python.exe server/manage.py test djangoapp --verbosity 2
.venv/Scripts/python.exe scripts/verify_sentiment.py
Push-Location server/database
npm.cmd test
Pop-Location
```

Django tests cover accounts, sessions, CSRF, invalid inputs, authorization,
server-controlled review authorship, purchase validation, filters, and routes.
Node integration tests use a real isolated MongoDB process, including concurrent
review IDs and persistence. Sentiment checks cover all three classes. UI checks
include registration, Kansas filtering, publishing a review, and admin login/logout.

The GitHub workflow builds/tests the application and container images. A local
test run is separate from an actual successful GitHub Actions run. Capture only
real workflow output for `CICD` and a real external deployment URL for the final task.

## Course submission

The AI option needs public URLs to `README.md`, `About.html`, `Contact.html`, and
`Register.jsx`, real command outputs, screenshots, GitHub Actions output, and a
deployed URL with deployment screenshots. The learner reviews and submits the final draft.

## Attribution

Starter and course fixtures: https://github.com/ibm-developer-skills-network/xrwvm-fullstack_developer_capstone
(Apache 2.0; original LICENSE retained). Staff names/contact details are fictional.
`server/frontend/static/team-generated.png` was generated with the built-in
image_gen tool as a photograph of fictional staff; its prompt is in `ASSETS.txt`.
Reviews created during verification are isolated demonstration data.
