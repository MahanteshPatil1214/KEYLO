"""add DPDP opt-out fields to leads

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-08 18:00:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply the migration."""
    op.add_column(
        'leads',
        sa.Column('opted_out', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        'leads',
        sa.Column('opted_out_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'leads',
        sa.Column('opted_out_reason', sa.String(length=500), nullable=True),
    )
    op.create_index(
        op.f('ix_leads_opted_out'), 'leads', ['opted_out'], unique=False
    )


def downgrade() -> None:
    """Revert the migration."""
    op.drop_index(op.f('ix_leads_opted_out'), table_name='leads')
    op.drop_column('leads', 'opted_out_reason')
    op.drop_column('leads', 'opted_out_at')
    op.drop_column('leads', 'opted_out')
