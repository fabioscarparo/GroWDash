"""
Authentication Router — JWT Token Issuance and Session Management
=================================================================

This module handles all authentication-related endpoints for the GroWDash API.
It is responsible for validating user credentials, issuing JWT tokens via
HttpOnly cookies, and managing session lifecycle (login/logout).

Security features:
    - Passwords are never stored or transmitted in plain text; bcrypt hashing
      is enforced at the database layer via the `auth` module.
    - JWT tokens are delivered exclusively through HttpOnly cookies, making
      them inaccessible to JavaScript and mitigating XSS-based token theft.
    - Rate limiting is applied to the login endpoint to prevent brute-force
      attacks. A maximum of 5 login attempts per minute is enforced per
      client IP address using slowapi.

Available Endpoints:
    POST /auth/token   → Validate credentials and set session cookie
    POST /auth/logout  → Clear session cookie
    GET  /auth/me      → Return the currently authenticated user

Dependencies:
    - slowapi: Rate limiting middleware backed by in-memory storage.
    - FastAPI's OAuth2PasswordRequestForm: Parses username/password from
      application/x-www-form-urlencoded request bodies.
    - SQLAlchemy Session: Injected per-request via the get_db dependency.
    - get_current_user: Cookie-based JWT validation dependency from auth.py.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

import models
from database import get_db
from auth import verify_password, create_access_token, get_current_user


# Rate limiter instance scoped to this router.
# Uses the client's remote IP address as the rate limit key.
# The limiter must also be registered on the FastAPI app instance in main.py
# via app.state.limiter and the RateLimitExceeded exception handler.
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


class Token(BaseModel):
    """
    Pydantic schema for JWT token responses.

    Used exclusively by the Swagger UI OAuth2 flow for documentation
    and testing purposes. The actual login endpoint does not return
    the token in the response body — it sets it as an HttpOnly cookie.

    Attributes:
        access_token: The encoded JWT string.
        token_type:   The token scheme, always "bearer" per OAuth2 spec.
    """
    access_token: str
    token_type: str


@router.post("/token")
@limiter.limit("5/minute")
def login_for_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Validate user credentials and issue a JWT session cookie.

    Accepts credentials as an application/x-www-form-urlencoded body
    (standard OAuth2 Password Flow format). On success, a signed JWT is
    set as an HttpOnly cookie named `growdash_token` with a 7-day TTL.

    Rate limiting:
        This endpoint is limited to 5 requests per minute per IP address.
        Exceeding this limit returns HTTP 429 Too Many Requests.

    Authentication flow:
        1. Look up the user record by username in the database.
        2. Verify the submitted password against the stored bcrypt hash.
        3. Generate a signed JWT containing the username as the `sub` claim.
        4. Set the JWT as an HttpOnly, SameSite=Lax cookie on the response.
        5. Return a confirmation message (no token in the response body).

    Security notes:
        - Both "user not found" and "wrong password" return the same HTTP 401
          with identical error messages to prevent username enumeration attacks.
        - The `request` parameter is required by slowapi to resolve the client
          IP for rate limit tracking; it is not used directly in the handler.
        - `secure=False` is intentional for HTTP-only local/LAN deployments.
          Set to True when the application is served over HTTPS.

    Args:
        request:   The incoming HTTP request (required by slowapi).
        response:  The outgoing HTTP response, used to set the session cookie.
        db:        SQLAlchemy database session, injected per request.
        form_data: Parsed OAuth2 credentials (username + password fields).

    Returns:
        dict: A JSON object with a single `message` key confirming success.
              Example: {"message": "Successfully logged in"}

    Raises:
        HTTPException 401: If the username does not exist or the password
                           does not match the stored hash.
        HTTPException 429: If the rate limit of 5 requests/minute is exceeded.
    """
    # Step 1 — Verify the username exists in the database
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 2 — Verify the submitted password against the stored bcrypt hash
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 3 — Generate a signed JWT with the username as the subject claim
    access_token = create_access_token(data={"sub": user.username})

    # Step 4 — Deliver the token via HttpOnly cookie
    # HttpOnly: inaccessible to JavaScript, mitigates XSS token theft.
    # SameSite=Lax: blocks cross-site request forgery in most scenarios
    #               while allowing top-level navigation links to work.
    # secure=False: acceptable for HTTP deployments; must be True for HTTPS.
    response.set_cookie(
        key="growdash_token",
        value=access_token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,   # 7 days in seconds
        expires=60 * 60 * 24 * 7,   # Redundant but improves browser compatibility
        samesite="lax",
        secure=False,                # Set to True when serving over HTTPS
    )

    return {"message": "Successfully logged in"}


@router.post("/logout")
def logout(response: Response):
    """
    Terminate the current session by clearing the authentication cookie.

    Instructs the client's browser to delete the `growdash_token` cookie
    by setting it to an expired value. No authentication is required to
    call this endpoint — an unauthenticated logout is a no-op from the
    server's perspective.

    Args:
        response: The outgoing HTTP response, used to delete the cookie.

    Returns:
        dict: A JSON object confirming the session was cleared.
              Example: {"message": "Successfully logged out"}
    """
    response.delete_cookie("growdash_token")
    return {"message": "Successfully logged out"}


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """
    Return the currently authenticated user's profile.

    Used by the frontend on application mount to verify whether a valid
    session cookie is present and to retrieve the username for display.
    The `get_current_user` dependency handles cookie extraction, JWT
    decoding, expiry validation and database lookup automatically.

    Args:
        current_user: The authenticated User model instance, resolved by
                      the get_current_user dependency. Returns HTTP 401
                      automatically if the cookie is missing or invalid.

    Returns:
        dict: A JSON object containing the authenticated user's username.
              Example: {"username": "fabio"}

    Raises:
        HTTPException 401: Raised automatically by get_current_user if
                           the session cookie is absent, expired or invalid.
    """
    return {"username": current_user.username}