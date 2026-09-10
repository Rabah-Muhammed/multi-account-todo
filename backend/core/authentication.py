import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from todos.models import Account


class AuthenticatedUser:
    """Represents the authenticated user attached to request.user."""
    def __init__(self, account, token_payload):
        self.account = account
        self.token_payload = token_payload
        self.is_authenticated = True

    def __str__(self):
        return str(self.account)


class Auth0JWTAuthentication(authentication.BaseAuthentication):
    """
    Validates Auth0 RS256 JWT tokens using Auth0's public JSON Web Key Set (JWKS).
    """
    jwks_client = None
    
    def authenticate_header(self, request):
        """Returns the WWW-Authenticate header challenge so DRF returns 401 instead of 403."""
        return 'Bearer'

    @classmethod
    def get_jwks_client(cls):
        if cls.jwks_client is None:
            jwks_url = f"https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json"
            cls.jwks_client = jwt.PyJWKClient(jwks_url, cache_keys=True)
        return cls.jwks_client

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]

        try:
            client = self.get_jwks_client()
            signing_key = client.get_signing_key_from_jwt(token)

            # Validate RS256 signature, issuer, and optional audience
            decode_kwargs = {
                'algorithms': ['RS256'],
                'issuer': f"https://{settings.AUTH0_DOMAIN}/",
            }
            if settings.AUTH0_AUDIENCE:
                decode_kwargs['audience'] = settings.AUTH0_AUDIENCE
            else:
                decode_kwargs['options'] = {'verify_aud': False}

            payload = jwt.decode(token, signing_key.key, **decode_kwargs)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired.')
        except jwt.PyJWTError as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
        except Exception as e:
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')

        auth0_user_id = payload.get('sub')
        if not auth0_user_id:
            raise exceptions.AuthenticationFailed('Token payload missing "sub" claim.')

        # Extract email if present in token claims (often namespaced or in userinfo)
        email = payload.get('email', '') or payload.get('https://api.todo-app.local/email', '')

        account, _ = Account.objects.get_or_create(
            auth0_user_id=auth0_user_id,
            defaults={'email': email}
        )

        user = AuthenticatedUser(account=account, token_payload=payload)
        return (user, token)