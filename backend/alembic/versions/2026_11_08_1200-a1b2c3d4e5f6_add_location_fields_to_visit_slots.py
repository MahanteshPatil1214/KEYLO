"""add location fields to visit_slots for map pin on site visits

Revision ID: a1b2c3d4e5f6
Revises: d4e5f6a7b8c9
Create Date: 2026-11-08 12:00:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply the migration."""
    op.add_column(
        'visit_slots',
        sa.Column('address', sa.String(length=500), nullable=True),
    )
    op.add_column(
        'visit_slots',
        sa.Column('latitude', sa.Float(), nullable=True),
    )
    op.add_column(
        'visit_slots',
        sa.Column('longitude', sa.Float(), nullable=True),
    )


def downgrade() -> None:
    """Revert the migration."""
    op.drop_column('visit_slots', 'address')
    op.drop_column('visit_slots', 'latitude')
    op.drop_column('visit_slots', 'longitude')
