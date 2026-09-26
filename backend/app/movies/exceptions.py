class MovieNotFoundError(Exception):
    """Exceção levantada quando um filme não é encontrado no repositório."""

    def __init__(self, identifier: str) -> None:
        self.identifier = identifier
        super().__init__(f"Filme com identificador '{identifier}' não foi encontrado.")