class UserAlreadyExistsError(Exception):
    """Lançada quando email ou nickname já estão em uso."""
    pass


class InvalidCredentialsError(Exception):
    """Lançada quando a combinação login/senha é incorreta."""
    pass


class UserNotFoundError(Exception):
    """Lançada quando um ID ou token não encontra usuário correspondente."""
    pass