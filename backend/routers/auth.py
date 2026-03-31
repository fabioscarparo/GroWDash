"""
Authentication Router — JWT Token Issuance and Session Management
=================================================================

This module handles all authentication-related endpoints for the GroWDash API.
It is responsible for validating user credentials, issuing JWT tokens via
HttpOnly cookies, managing session lifecycle (login/logout), and issuing
short-lived OAuth2 authorization codes for the Google Home integration.

Security model
--------------
Passwords
    Passwords are never stored or transmitted in plain text. Bcrypt hashing
    is enforced at the database layer via the ``auth`` module.

Session tokens
    JWTs are delivered exclusively through HttpOnly cookies named
    ``growdash_token``.  Being HttpOnly they are inaccessible to JavaScript,
    which mitigates the most common XSS-based token theft vectors.

Google Home OAuth codes
    A dedicated endpoint issues short-lived (5-minute) JWT codes that carry a
    ``purpose: google-home-oauth`` claim.  This claim isolates them from regular
    session tokens so the Google Home router can reject anything that was not
    explicitly minted for the OAuth flow.

Rate limiting
    Login attempts are capped at 5 per minute per client IP address using
    slowapi to mitigate brute-force attacks.

Available endpoints
-------------------
POST /auth/token             → Validate credentials and set session cookie
POST /auth/logout            → Clear the session cookie
GET  /auth/me                → Return the currently authenticated user
POST /auth/google-home/code  → Issue a one-time OAuth2 code for Google Home

Dependencies
------------
- slowapi                   : Rate limiting middleware backed by in-memory storage.
- OAuth2PasswordRequestForm : Parses ``username`` / ``password`` from
                              ``application/x-www-form-urlencoded`` bodies.
- SQLAlchemy Session        : Injected per-request via the ``get_db`` dependency.
- get_current_user          : Cookie-based JWT validation dependency from auth.py.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

import models
from auth import create_access_token, get_current_user, verify_password
from database import get_db

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
# Scoped to this router but keyed on the same function used by the global
# limiter in main.py so slowapi resolves limits consistently across restarts.
limiter = Limiter(key_func=get_remote_address)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class Token(BaseModel):
    """
    Pydantic schema for JWT token responses.

    Used exclusively by the Swagger UI OAuth2 flow for interactive
    documentation and testing.  The production login endpoint does **not**
    return the token in the response body — it delivers it as an HttpOnly
    cookie instead.

    Attributes:
        access_token: The encoded JWT string.
        token_type:   Always ``"bearer"`` per the OAuth2 specification.
    """

    access_token: str
    token_type: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/token")
@limiter.limit("5/minute")
def login_for_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """
    Validate user credentials and issue a JWT session cookie.

    Accepts an ``application/x-www-form-urlencoded`` body following the
    standard OAuth2 Password Flow format.  On success a signed JWT is set
    as an HttpOnly cookie named ``growdash_token`` with a 7-day TTL.

    Authentication flow
    -------------------
    1. Look up the user record by ``username`` in the database.
    2. Verify the submitted password against the stored bcrypt hash.
    3. Generate a signed JWT with the username as the ``sub`` claim.
    4. Set the JWT as an HttpOnly, SameSite=Lax cookie on the response.
    5. Return a plain confirmation message — the token is never in the body.

    Rate limiting
    -------------
    This endpoint is capped at **5 requests per minute** per client IP.
    Exceeding the limit returns HTTP 429 with a ``Retry-After`` header.

    Security notes
    --------------
    - Both "user not found" and "wrong password" return the same HTTP 401
      with an identical message to prevent username enumeration attacks.
    - ``secure=False`` is intentional for HTTP-only LAN/Docker deployments.
      Set it to ``True`` when the application is served over HTTPS.
    - The ``request`` parameter is consumed by slowapi for IP resolution and
      is not referenced directly inside the handler body.

    Args:
        request:   Incoming HTTP request (required by the slowapi decorator).
        response:  Outgoing HTTP response, used to attach the session cookie.
        db:        SQLAlchemy session injected per request via ``get_db``.
        form_data: Parsed OAuth2 credentials (``username`` + ``password``).

    Returns:
        dict: ``{"message": "Successfully logged in"}``

    Raises:
        HTTPException 401: Username not found or password mismatch.
        HTTPException 429: Rate limit exceeded.
    """
    # Step 1 — look up the user
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 2 — verify password against bcrypt hash
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 3 — mint a session JWT
    access_token = create_access_token(data={"sub": user.username})

    # Step 4 — deliver via HttpOnly cookie
    # HttpOnly    : invisible to JavaScript → mitigates XSS token theft.
    # SameSite=Lax: blocks most CSRF vectors while allowing top-level links.
    # secure=False: correct for plain-HTTP LAN deployments; flip for HTTPS.
    response.set_cookie(
        key="growdash_token",
        value=access_token,
        httponly=True,
        max_age=60 * 60 * 24 * 7,   # 7 days in seconds
        expires=60 * 60 * 24 * 7,   # redundant but improves browser compat
        samesite="lax",
        secure=False,                # set to True when serving over HTTPS
    )

    return {"message": "Successfully logged in"}


@router.post("/logout")
def logout(response: Response):
    """
    Terminate the current session by clearing the authentication cookie.

    Instructs the browser to delete ``growdash_token`` by overwriting it
    with an expired value.  No authentication is required — calling this
    endpoint while already logged out is a harmless no-op.

    Args:
        response: Outgoing HTTP response used to delete the cookie.

    Returns:
        dict: ``{"message": "Successfully logged out"}``
    """
    response.delete_cookie("growdash_token")
    return {"message": "Successfully logged out"}


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """
    Return the currently authenticated user's public profile.

    Called by the frontend on every application mount to verify that a
    valid session cookie is present and to retrieve the username for
    display in the sidebar and account page.

    The ``get_current_user`` dependency handles the full validation pipeline:
    cookie extraction → JWT decoding → expiry check → database lookup.
    It raises HTTP 401 automatically on any failure, so the handler only
    executes when the user is genuinely authenticated.

    Args:
        current_user: Authenticated ``User`` model instance resolved by
                      the ``get_current_user`` dependency.

    Returns:
        dict: ``{"username": "<username>"}``

    Raises:
        HTTPException 401: Session cookie absent, expired, or invalid.
    """
    return {"username": current_user.username}


@router.post("/google-home/code")
def generate_google_home_code(
    current_user: models.User = Depends(get_current_user),
):
    """
    Issue a one-time OAuth2 authorization code for the Google Home linking flow.

    This endpoint is called by ``GoogleHomeLinking.jsx`` immediately after the
    user taps "Authorize Google Home".  It generates a short-lived JWT that
    Google will then exchange for a proper access token via
    ``POST /google-home/token``.

    The code is deliberately isolated from regular session tokens through two
    mechanisms:

    1. **TTL of 5 minutes** — far shorter than the 7-day session TTL, limiting
       the window during which a captured code could be replayed.
    2. **``purpose: google-home-oauth`` claim** — the Google Home token endpoint
       rejects any code that does not carry this exact claim, so a normal session
       cookie cannot be used to authorize Google Home and vice-versa.
    3. **One-time use** — the Google Home router hashes each code on arrival
       and records it in ``_used_codes``; a second attempt with the same code
       is rejected with HTTP 400 even before the JWT TTL expires.

    Requires an active GroWDash session cookie (``growdash_token``).

    Args:
        current_user: Authenticated ``User`` model instance resolved by
                      the ``get_current_user`` dependency.

    Returns:
        dict: ``{"code": "<signed JWT>"}``

    Raises:
        HTTPException 401: Session cookie absent, expired, or invalid.
    """
    code = create_access_token(
        data={
            "sub": current_user.username,
            "purpose": "google-home-oauth",
        },
        expires_delta=timedelta(minutes=5),
    )
    return {"code": code}