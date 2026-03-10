import sys
import os
import getpass

# Add the parent directory to sys.path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models
from auth import get_password_hash

def main():
    print("=== GroWDash User Creation Utility ===")
    
    db = SessionLocal()
    try:
        username = input("Enter new username: ").strip()
        if not username:
            print("Username cannot be empty.")
            return

        existing_user = db.query(models.User).filter(models.User.username == username).first()
        if existing_user:
            print(f"Error: User '{username}' already exists in the database.")
            return

        password = getpass.getpass("Enter password: ").strip()
        if not password:
            print("Password cannot be empty.")
            return
            
        confirm_password = getpass.getpass("Confirm password: ").strip()
        if password != confirm_password:
            print("Passwords do not match!")
            return

        # Create user
        hashed = get_password_hash(password)
        new_user = models.User(username=username, hashed_password=hashed)
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"Success! User '{username}' has been created with ID: {new_user.id}")
        
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
