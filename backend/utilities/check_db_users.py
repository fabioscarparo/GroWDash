import sys
import os

# Add the parent directory to sys.path so we can import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import models

def check_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        if not users:
            print("No users found in database.")
        else:
            print(f"Found {len(users)} users:")
            for user in users:
                print(f"- ID: {user.id}, Username: {user.username}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
