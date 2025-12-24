import enum

class UserRole(enum.Enum):
    superuser = "superuser"
    admin = "admin"
    user = "user"