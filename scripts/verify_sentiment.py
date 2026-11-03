import importlib.util
from pathlib import Path
source = Path(__file__).resolve().parents[1] / 'server/djangoapp/microservices/app.py'
spec = importlib.util.spec_from_file_location('sentiment', source)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
client = module.app.test_client()
for text, expected in [('Fantastic services', 'positive'), ('Awful horrible service', 'negative'), ('The vehicle is in the showroom', 'neutral')]:
    response = client.get('/analyze/' + text)
    assert response.status_code == 200
    assert response.json['sentiment'] == expected, response.json
    print(text, response.json)
