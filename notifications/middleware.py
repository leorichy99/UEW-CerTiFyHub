"""
JWT authentication middleware for WebSocket connections.

Extracts JWT token from query string (?token=xxx), validates it,
and sets scope["user"] to the authenticated User.
"""

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser, User
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger('notifications')


@database_sync_to_async
def get_user_from_token(token_str):
    """Validate JWT access token and return the corresponding User."""
    try:
        validated = AccessToken(token_str)
        user_id = validated['user_id']
        return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist, KeyError) as e:
        logger.debug(f'WebSocket JWT auth failed: {e}')
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    ASGI middleware that authenticates WebSocket connections via JWT.

    Token is passed as a query parameter: ws://host/ws/notifications/?token=<JWT>
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        params = parse_qs(query_string)
        token_list = params.get('token', [])

        if token_list:
            scope['user'] = await get_user_from_token(token_list[0])
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
