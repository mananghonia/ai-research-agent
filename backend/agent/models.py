import uuid
from django.db import models


class ResearchSession(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('complete', 'Complete'),
        ('failed', 'Failed'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.CharField(max_length=500)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.topic[:60]} [{self.status}]"


class ResearchStep(models.Model):
    STEP_TYPES = [
        ('search', 'Search'),
        ('read', 'Read'),
        ('think', 'Think'),
        ('report', 'Report'),
        ('error', 'Error'),
    ]
    session = models.ForeignKey(
        ResearchSession, on_delete=models.CASCADE, related_name='steps'
    )
    step_type = models.CharField(max_length=20, choices=STEP_TYPES)
    content = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class ResearchReport(models.Model):
    session = models.OneToOneField(
        ResearchSession, on_delete=models.CASCADE, related_name='report'
    )
    content = models.TextField()
    sources = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report for: {self.session.topic[:60]}"
