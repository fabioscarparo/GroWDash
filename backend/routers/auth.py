from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

import models
from database import get_db
from auth import verify_password, create_access_token, get_current_user

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/token")
def login_for_access_token(
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Validates user credentials and issues a JWT access token via an HttpOnly cookie.
    """
    # Verify username exists
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify hashed password matches plain text password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate the JWT
    access_token = create_access_token(data={"sub": user.username})
    
    # Set the JWT as an HttpOnly cookie
    response.set_cookie(
        key="growdash_token",
        value=access_token,
        httponly=True,
        max_age=60 * 60 * 24 * 7, # 7 days
        expires=60 * 60 * 24 * 7,
        samesite="lax",
        secure=False, # Set to True if using HTTPS in production
    )
    
    return {"message": "Successfully logged in"}

@router.post("/logout")
def logout(response: Response):
    """
    Clears the authentication cookie.
    """
    response.delete_cookie("growdash_token")
    return {"message": "Successfully logged out"}

@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """
    Returns the currently authenticated user.
    """
    return {"username": current_user.username}
