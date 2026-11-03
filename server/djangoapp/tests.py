import json
from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase, Client
from .models import CarMake, CarModel


class PortalTests(TestCase):
    def setUp(self):
        self.password = 'Local-Test-Password-483!'
        self.user = User.objects.create_user('driver', 'driver@example.test', self.password, first_name='Demo', last_name='Driver')
        make = CarMake.objects.create(name='Ford')
        CarModel.objects.create(car_make=make, name='Focus', year=2022)

    def post(self, path, data):
        return self.client.post('/djangoapp/' + path, json.dumps(data), content_type='application/json')

    def test_registration_and_duplicate_username(self):
        data = {'userName': 'newdriver', 'password': self.password, 'email': 'new@example.test', 'firstName': 'New', 'lastName': 'Driver'}
        response = self.post('register', data)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(self.client.get('/djangoapp/session').json()['authenticated'])
        self.assertEqual(self.post('register', data).status_code, 400)
        self.assertTrue(User.objects.get(username='newdriver').check_password(self.password))

    def test_registration_rejects_weak_password_and_invalid_email(self):
        data = {'userName': 'weakdriver', 'password': '123', 'email': 'bad', 'firstName': 'A', 'lastName': 'B'}
        self.assertEqual(self.post('register', data).status_code, 400)
        self.assertFalse(User.objects.filter(username='weakdriver').exists())

    def test_login_and_logout_affect_server_session(self):
        self.assertEqual(self.post('login', {'userName': 'driver', 'password': 'bad'}).status_code, 401)
        self.assertEqual(self.post('login', {'userName': 'driver', 'password': self.password}).status_code, 200)
        self.assertEqual(self.client.get('/djangoapp/session').json()['userName'], 'driver')
        self.assertEqual(self.post('logout', {}).status_code, 200)
        self.assertFalse(self.client.get('/djangoapp/session').json()['authenticated'])
        self.assertEqual(self.client.get('/djangoapp/logout').status_code, 405)

    def test_csrf_is_enforced_for_login(self):
        browser = Client(enforce_csrf_checks=True)
        payload = json.dumps({'userName': 'driver', 'password': self.password})
        self.assertEqual(browser.post('/djangoapp/login', payload, content_type='application/json').status_code, 403)
        browser.get('/djangoapp/session')
        token = browser.cookies['csrftoken'].value
        self.assertEqual(browser.post('/djangoapp/login', payload, content_type='application/json', HTTP_X_CSRFTOKEN=token).status_code, 200)

    def test_malformed_json_is_a_client_error(self):
        response = self.client.post('/djangoapp/login', '{bad', content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_cars_include_relational_make_model_and_year(self):
        data = self.client.get('/djangoapp/get_cars').json()
        self.assertEqual(data['CarMakes'][0]['name'], 'Ford')
        self.assertEqual(data['CarModels'][0]['CarModel'], 'Focus')
        self.assertEqual(data['CarModels'][0]['year'], 2022)

    def test_anonymous_review_is_rejected_before_service_call(self):
        with patch('djangoapp.views.post_review') as submit:
            self.assertEqual(self.post('add_review', {'dealership': 1, 'review': 'A good visit', 'purchase': False}).status_code, 401)
            submit.assert_not_called()

    @patch('djangoapp.views.get_request', return_value=[{'id': 1}])
    @patch('djangoapp.views.analyze_review_sentiments', return_value={'sentiment': 'positive'})
    @patch('djangoapp.views.post_review', side_effect=lambda data: {'id': 100, **data})
    def test_review_uses_authenticated_identity_and_real_purchase(self, submit, sentiment, dealers):
        self.client.force_login(self.user)
        response = self.post('add_review', {'dealership': 1, 'name': 'Forged Name', 'review': 'Fantastic services', 'purchase': True, 'purchase_date': '2024-06-01', 'car_make': 'Ford', 'car_model': 'Focus', 'car_year': 2022})
        self.assertEqual(response.status_code, 201)
        sent = submit.call_args.args[0]
        self.assertEqual(sent['name'], 'Demo Driver')
        self.assertEqual(sent['user_id'], self.user.id)
        self.assertEqual(sent['sentiment'], 'positive')
        self.assertEqual(sent['car_model'], 'Focus')

    @patch('djangoapp.views.get_request', return_value=[{'id': 1}])
    @patch('djangoapp.views.post_review')
    def test_review_rejects_bad_car_or_future_purchase(self, submit, dealers):
        self.client.force_login(self.user)
        data = {'dealership': 1, 'review': 'Fantastic services', 'purchase': True, 'purchase_date': '2024-06-01', 'car_make': 'Ford', 'car_model': 'Missing', 'car_year': 2022}
        self.assertEqual(self.post('add_review', data).status_code, 400)
        data.update(car_model='Focus', purchase_date='2099-01-01')
        self.assertEqual(self.post('add_review', data).status_code, 400)
        submit.assert_not_called()

    @patch('djangoapp.views.get_request', return_value=[])
    def test_state_is_a_literal_path_segment(self, get):
        self.client.get('/djangoapp/get_dealers/Kansas')
        get.assert_called_once_with('fetchDealers/Kansas')

    def test_static_pages_and_spa_render(self):
        for path in ['/', '/login', '/register', '/dealer/1', '/postreview/1', '/about/', '/contact/']:
            self.assertEqual(self.client.get(path).status_code, 200, path)
        self.assertContains(self.client.get('/about/'), 'Maya Chen')
        self.assertContains(self.client.get('/contact/'), 'aria-current="page" class="active" href="/contact/"')

    def test_admin_requires_login(self):
        response = self.client.get('/admin/')
        self.assertEqual(response.status_code, 302)
        self.assertIn('/admin/login/', response.url)
