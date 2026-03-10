from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

import models
from database import get_db
from auth import verify_password, create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/token", response_model=Token)
def login_for_access_token(
    db: Session = Depends(get_db),
    # OAuth2PasswordRequestForm expects username and password from form data
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Validates user credentials and issues a JWT access token if successful.
    """
    # Verify username exists
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password", # Vague message for security
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify hashed password matches plain text password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password", # Vague message for security
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # If credentials are valid, generate and return the JWT
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}
