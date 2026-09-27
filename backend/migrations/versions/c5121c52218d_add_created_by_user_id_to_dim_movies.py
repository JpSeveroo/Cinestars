"""add_created_by_user_id_to_dim_movies

Revision ID: c5121c52218d
Revises: 64106a259fad
Create Date: 2026-09-27 18:35:15.089664

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c5121c52218d'
down_revision: Union[str, Sequence[str], None] = '64106a259fad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Adiciona a coluna e a chave estrangeira na tabela
    with op.batch_alter_table('dim_movies', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_by_user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            batch_op.f('fk_dim_movies_created_by_user_id_users'),
            'users',
            ['created_by_user_id'],
            ['id'],
            ondelete='SET NULL'
        )

    # 2. Cria o índice nativamente fora do batch para o SQLite não quebrar
    op.create_index(
        op.f('ix_dim_movies_created_by_user_id'),
        'dim_movies',
        ['created_by_user_id'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_dim_movies_created_by_user_id'), table_name='dim_movies')
    with op.batch_alter_table('dim_movies', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_dim_movies_created_by_user_id_users'), type_='foreignkey')
        batch_op.drop_column('created_by_user_id')