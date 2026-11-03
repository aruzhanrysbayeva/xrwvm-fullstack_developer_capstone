from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class CarMake(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    def __str__(self):
        return self.name

class CarModel(models.Model):
    car_make = models.ForeignKey(CarMake, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=80)
    TYPE_CHOICES = [(x, x) for x in ['Sedan', 'SUV', 'Wagon', 'Hatchback', 'Truck', 'Coupe', 'Convertible', 'Van']]
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='Sedan')
    year = models.IntegerField(validators=[MinValueValidator(1990), MaxValueValidator(2100)])
    class Meta:
        constraints = [models.UniqueConstraint(fields=['car_make', 'name', 'year'], name='unique_car_model_year')]
    def __str__(self):
        return f'{self.car_make} {self.name} ({self.year})'
