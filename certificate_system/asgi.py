"""
ASGI config for certificate_system project.

Routes HTTP to Django and WebSocket to Channels consumers.
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'certificate_system.settings')

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from notifications.middleware import JWTAuthMiddleware
from notifications.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})
