"""
Database models used by the GroWDash backend.
"""

from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    """
    Persisted application user with username and hashed password.

    Attributes:
        id (int): Primary key for the user record.
        username (str): Unique username for authentication. Indexed.
        hashed_password (str): Bcrypt hash of the user's password.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
