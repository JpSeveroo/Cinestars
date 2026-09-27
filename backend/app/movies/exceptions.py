class MovieNotFoundError(Exception):
    """Exceção levantada quando um filme não é encontrado no repositório."""

    def __init__(self, identifier: str) -> None:
        self.identifier = identifier
        super().__init__(f"Filme com identificador '{identifier}' não foi encontrado.")


class MoviePermissionError(Exception):
    """Exceção levantada quando um usuário não tem permissão para editar ou excluir um filme."""

    def __init__(self, message: str = "Você não tem permissão para editar ou excluir este filme.") -> None:
        self.message = message
        super().__init__(message)