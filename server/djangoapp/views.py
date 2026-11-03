import json
import logging
from datetime import date
from functools import wraps
from urllib.parse import quote
import requests
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from .models import CarMake, CarModel
from .restapis import get_request, post_review, analyze_review_sentiments

logger = logging.getLogger(__name__)

def api_errors(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError, TypeError, KeyError) as exc:
            return JsonResponse({'status': 400, 'error': str(exc) or 'Invalid request'}, status=400)
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 404:
                return JsonResponse({'status': 404, 'error': 'Dealer not found'}, status=404)
            logger.exception('Backend HTTP error')
            return JsonResponse({'status': 502, 'error': 'A service is temporarily unavailable. Please try again.'}, status=502)
        except requests.RequestException:
            logger.exception('Backend connection error')
            return JsonResponse({'status': 502, 'error': 'A service is temporarily unavailable. Please try again.'}, status=502)
    return wrapped

def body(request):
    data = json.loads(request.body or '{}')
    if not isinstance(data, dict):
        raise ValueError('A JSON object is required')
    return data

def user_data(user):
    return {'userName': user.username, 'firstname': user.first_name, 'lastname': user.last_name}

@ensure_csrf_cookie
def frontend(request):
    return render(request, 'index.html')

@require_GET
@ensure_csrf_cookie
def session_user(request):
    return JsonResponse({'authenticated': request.user.is_authenticated, **(user_data(request.user) if request.user.is_authenticated else {})})

@require_POST
@api_errors
def login_user(request):
    data = body(request)
    user = authenticate(request, username=data.get('userName', ''), password=data.get('password', ''))
    if user is None:
        return JsonResponse({'status': 401, 'error': 'Invalid username or password'}, status=401)
    login(request, user)
    return JsonResponse({'status': 'Authenticated', **user_data(user)})

@require_POST
def logout_user(request):
    logout(request)
    return JsonResponse({'status': 'Logged out'})

@require_POST
@api_errors
def registration(request):
    data = body(request)
    username = str(data.get('userName', '')).strip()
    email = str(data.get('email', '')).strip()
    password = data.get('password', '')
    user = User(username=username, email=email, first_name=str(data.get('firstName', '')).strip(), last_name=str(data.get('lastName', '')).strip())
    try:
        if not all([username, email, password, user.first_name, user.last_name]):
            raise ValidationError('Complete all five fields.')
        user.full_clean(exclude=['password'])
        validate_email(email)
        validate_password(password, user)
        with transaction.atomic():
            user.set_password(password)
            user.save()
    except (ValidationError, IntegrityError) as exc:
        messages = exc.messages if isinstance(exc, ValidationError) else ['That username is already registered.']
        return JsonResponse({'status': 400, 'error': ' '.join(messages)}, status=400)
    login(request, user)
    return JsonResponse({'status': 'Authenticated', **user_data(user)}, status=201)

@require_GET
@api_errors
def get_dealerships(request, state='All'):
    endpoint = 'fetchDealers' if state in ('All', '') else 'fetchDealers/' + quote(state, safe='')
    return JsonResponse({'status': 200, 'dealers': get_request(endpoint)})

@require_GET
@api_errors
def get_dealer_details(request, dealer_id):
    return JsonResponse({'status': 200, 'dealer': get_request(f'fetchDealer/{dealer_id}')})

@require_GET
@api_errors
def get_dealer_reviews(request, dealer_id):
    get_request(f'fetchDealer/{dealer_id}')
    reviews = get_request(f'fetchReviews/dealer/{dealer_id}')
    for review in reviews:
        if not review.get('sentiment'):
            review['sentiment'] = analyze_review_sentiments(review['review'])['sentiment']
    return JsonResponse({'status': 200, 'reviews': reviews})

@require_GET
def get_cars(request):
    cars = [{'id': x.id, 'CarMake': x.car_make.name, 'CarModel': x.name, 'year': x.year, 'type': x.type} for x in CarModel.objects.select_related('car_make').order_by('car_make__name', 'name', 'year')]
    return JsonResponse({'status': 200, 'CarMakes': list(CarMake.objects.order_by('name').values('id', 'name', 'description')), 'CarModels': cars})

@require_POST
@api_errors
def add_review(request):
    if not request.user.is_authenticated:
        return JsonResponse({'status': 401, 'error': 'Please log in to write a review.'}, status=401)
    data = body(request)
    dealer_id = int(data.get('dealership', 0))
    get_request(f'fetchDealer/{dealer_id}')
    text = str(data.get('review', '')).strip()
    if not 5 <= len(text) <= 3000:
        raise ValueError('Write a review between 5 and 3000 characters.')
    purchase = data.get('purchase', False)
    if not isinstance(purchase, bool):
        raise ValueError('Purchase must be true or false.')
    car = {}
    if purchase:
        purchased_on = date.fromisoformat(data['purchase_date'])
        if purchased_on > date.today():
            raise ValueError('Purchase date cannot be in the future.')
        year = int(data['car_year'])
        if not CarModel.objects.filter(car_make__name=data['car_make'], name=data['car_model'], year=year).exists():
            raise ValueError('Choose a valid car make, model, and year.')
        car = {'purchase_date': purchased_on.isoformat(), 'car_make': data['car_make'], 'car_model': data['car_model'], 'car_year': year}
    review = {
        'user_id': request.user.id, 'name': request.user.get_full_name() or request.user.username,
        'dealership': dealer_id, 'review': text, 'purchase': purchase, **car,
        'sentiment': analyze_review_sentiments(text)['sentiment'],
    }
    saved = post_review(review)
    return JsonResponse({'status': 200, 'review': saved}, status=201)
