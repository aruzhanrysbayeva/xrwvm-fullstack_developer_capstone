"""Create isolated local demo users; never replace an existing account password."""
import json
import os
from pathlib import Path
import secrets
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'server'))
envfile = root / '.env'
if not envfile.exists():
    envfile.write_text('DJANGO_SECRET_KEY=' + secrets.token_urlsafe(48) + '\nDJANGO_DEBUG=true\n', encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djangoproj.settings')
import django
django.setup()
from django.contrib.auth.models import User

credentials = root / '.local-credentials.json'
if credentials.exists():
    data = json.loads(credentials.read_text())
else:
    data = {'root': secrets.token_urlsafe(20), 'reviewer': secrets.token_urlsafe(20)}
    credentials.write_text(json.dumps(data), encoding='utf-8')
for username, password in data.items():
    if not User.objects.filter(username=username).exists():
        User.objects.create_user(username, f'{username}@example.test', password,
                                 first_name='Alex' if username == 'reviewer' else '',
                                 last_name='Morgan' if username == 'reviewer' else 'Administrator',
                                 is_staff=username == 'root', is_superuser=username == 'root')
        print(f'Created isolated demo account: {username}')
print('Demo credentials are in the git-ignored .local-credentials.json file.')
