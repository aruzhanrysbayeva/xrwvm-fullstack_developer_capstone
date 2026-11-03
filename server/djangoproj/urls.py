from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from djangoapp.views import frontend

urlpatterns = [
    path('admin/', admin.site.urls),
    path('djangoapp/', include('djangoapp.urls')),
    path('about/', TemplateView.as_view(template_name='About.html'), name='about'),
    path('contact/', TemplateView.as_view(template_name='Contact.html'), name='contact'),
    re_path(r'^(?:|login/?|register/?|dealers/?|dealer/\d+/?|postreview/\d+/?)$', frontend),
]
