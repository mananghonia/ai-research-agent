from django.urls import path
from . import views

urlpatterns = [
    path("research/start/", views.start_research, name="start_research"),
    path("research/<uuid:session_id>/stream/", views.stream_research, name="stream_research"),
    path("research/<uuid:session_id>/report/", views.get_report, name="get_report"),
    path("research/<uuid:session_id>/pdf/", views.export_pdf, name="export_pdf"),
    path("history/", views.list_history, name="list_history"),
]
