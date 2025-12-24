# app/scripts/create_superadmin.py

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.models.enum.user_role import UserRole
from app.core.security import get_password_hash

def main():
    db: Session = SessionLocal()

    exists = (
        db.query(User)
        .filter(User.role == UserRole.superuser)
        .first()
    )

    if exists:
        print("Super admin already exists")
        return

    email = input("Super admin email: ").strip()
    password = input("Super admin password: ").strip()

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


if __name__ == "__main__":
    main()