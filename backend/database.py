from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# SQLite database file path. 
# It will be created in the current directory (backend).
SQLALCHEMY_DATABASE_URL = "sqlite:///./growdash.db"

# Setting up the SQLAlchemy engine.
# check_same_thread=False is needed only for SQLite to allow FastAPI to access the db from different threads.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Each instance of the SessionLocal class will be a database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class used to create database models.
Base = declarative_base()

# Dependency function to get a database session for a request and close it afterwards.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
