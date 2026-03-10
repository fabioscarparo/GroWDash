import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import models
from database import get_db

load_dotenv()

# Configuration for JWT encoding/decoding. 
# A secret key is needed to sign the tokens. It MUST be stored in .env
SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not SECRET_KEY:
    raise ValueError("FATAL ERROR: JWT_SECRET_KEY is missing from the .env file. Please add it to start the server safely.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days by default

# Setting up the password hashing context to use bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme: this tells FastAPI where to look for the token (the tokenUrl)
# e.g., in the Swagger UI, it will use this endpoint to retrieve the token to test other endpoints.
# auto_error=False is crucial here because we now use cookies; we don't want a 401 
# just because the header is missing.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generates a bcrypt hash for a given password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token containing the provided payload data."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add expiration time to the payload
    to_encode.update({"exp": expire})
    # Encode and sign the JWT using the secret key and algorithm
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    growdash_token: Optional[str] = Cookie(None),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    FastAPI Dependency that extracts and validates the JWT token.
    It prioritizes the HttpOnly cookie 'growdash_token', with 
    the Authorization header as a fallback for Swagger UI.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Prioritize cookie, then header
    final_token = growdash_token or token
    
    if not final_token:
        raise credentials_exception
        
    try:
        # Decode the token payload
        payload = jwt.decode(final_token, SECRET_KEY, algorithms=[ALGORITHM])
        # We expect the username to be stored in the "sub" (subject) claim
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception
    
    # Fetch the user from the database
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
        
    return user
