"""Run real cURL requests against the isolated local services and preserve output."""
import json
import shlex
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / 'evidence'
out.mkdir(exist_ok=True)
credentials = json.loads((root / '.local-credentials.json').read_text())
cookie = out / 'curl-cookies.txt'
base = 'http://127.0.0.1:8000'

def run(name, url, extra=(), display_extra=None):
    common = ['curl.exe', '--silent', '--show-error', '--max-time', '45', '-b', str(cookie), '-c', str(cookie)]
    command = [*common, *extra, '-w', '\nHTTP_STATUS:%{http_code}\n', url]
    result = subprocess.run(command, capture_output=True, check=True)
    raw = result.stdout.decode('utf-8')
    shown = [*common, *(display_extra if display_extra is not None else extra), '-w', '\nHTTP_STATUS:%{http_code}\n', url]
    text = '$ ' + shlex.join(shown) + '\n\n' + raw
    if name:
        (out / (name + '.txt')).write_text(text, encoding='utf-8')
    code = int(raw.rsplit('HTTP_STATUS:', 1)[1].strip())
    if code >= 400:
        raise RuntimeError(f'{name}: HTTP {code}: {raw[:500]}')
    print(f'{name or "session"}: HTTP {code}')
    return raw

run(None, base + '/djangoapp/session')
csrf = [line.split('\t')[-1] for line in cookie.read_text().splitlines() if '\tcsrftoken\t' in line][-1]
payload = out / 'login_payload.json'
payload.write_text(json.dumps({'userName': 'reviewer', 'password': credentials['reviewer']}), encoding='utf-8')
extras = ['-X', 'POST', '-H', 'Content-Type: application/json', '-H', 'X-CSRFToken: '+csrf, '--data-binary', '@'+str(payload)]
display = ['-X', 'POST', '-H', 'Content-Type: application/json', '-H', 'X-CSRFToken: $CSRF_TOKEN', '--data-binary', '@'+str(payload)]
run('loginuser', base + '/djangoapp/login', extras, display)
for filename, endpoint in [
    ('getdealerreviews', '/djangoapp/reviews/dealer/17'),
    ('getalldealers', '/djangoapp/get_dealers'),
    ('getdealerbyid', '/djangoapp/dealer/1'),
    ('getdealersbyState', '/djangoapp/get_dealers/Kansas'),
    ('getallcarmakes', '/djangoapp/get_cars'),
]:
    run(filename, base + endpoint)
run('analyzereview', 'http://127.0.0.1:5050/analyze/Fantastic%20services')
csrf = [line.split('\t')[-1] for line in cookie.read_text().splitlines() if '\tcsrftoken\t' in line][-1]
run('logoutuser', base + '/djangoapp/logout', ['-X', 'POST', '-H', 'X-CSRFToken: '+csrf], ['-X', 'POST', '-H', 'X-CSRFToken: $CSRF_TOKEN'])
print('cURL evidence captured. CSRF token is represented by $CSRF_TOKEN; cookie jar and login payload stay private and git-ignored.')
