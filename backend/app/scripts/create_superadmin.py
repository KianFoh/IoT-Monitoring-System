# app/scripts/create_superadmin.py

from getpass import getpass
from sqlalchemy.orm import Session
from pydantic import EmailStr, ValidationError
from app.core.database import SessionLocal
from app.models.user import User
from app.models.enum.user_role import UserRole
from app.core.security import get_password_hash

def main():
    db: Session = SessionLocal()
    try:
        exists = (
            db.query(User)
            .filter(User.role == UserRole.superuser)
            .first()
        )

        if exists:
            print("Super admin already exists")
            return

        raw_email = input("Super admin email: ").strip()
        try:
            email = EmailStr(raw_email)
        except ValidationError:
            print("Invalid email address.")
            return

        password = getpass("Super admin password: ").strip()
        if not password:
            print("Password cannot be empty.")
            return

        user = User(
            email=email,
            password=get_password_hash(password),
            role=UserRole.superuser,
            is_active=True,
            is_verified=True
        )

        db.add(user)
        db.commit()

        print("Super admin created successfully")
    finally:
        db.close()


if __name__ == "__main__":
    main()
