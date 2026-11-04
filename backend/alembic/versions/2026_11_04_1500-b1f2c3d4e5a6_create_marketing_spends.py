"""create marketing spends

Revision ID: b1f2c3d4e5a6
Revises: 3df128151593
Create Date: 2026-11-04 15:00:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f2c3d4e5a6'
down_revision: Union[str, None] = '3df128151593'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply the migration."""
    op.create_table(
        'marketing_spends',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=True),
        sa.Column('source', sa.String(length=32), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('created_by_id', sa.Uuid(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            'amount >= 0',
            name=op.f(
                'ck_marketing_spends_ck_marketing_spends_amount_non_negative'
            ),
        ),
        sa.CheckConstraint(
            'period_start <= period_end',
            name=op.f('ck_marketing_spends_ck_marketing_spends_period_ordered'),
        ),
        sa.CheckConstraint(
            "source IN ('WEBSITE', 'PROPERTY_PORTAL', 'SOCIAL_MEDIA', "
            "'HOARDING', 'REFERRAL', 'OTHER')",
            name=op.f('ck_marketing_spends_ck_marketing_spends_source'),
        ),
        sa.ForeignKeyConstraint(
            ['created_by_id'],
            ['users.id'],
            name=op.f('fk_marketing_spends_created_by_id_users'),
            ondelete='SET NULL',
        ),
        sa.ForeignKeyConstraint(
            ['project_id'],
            ['projects.id'],
            name=op.f('fk_marketing_spends_project_id_projects'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_marketing_spends')),
    )
    op.create_index(
        op.f('ix_marketing_spends_created_at'),
        'marketing_spends',
        ['created_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_marketing_spends_project_id'),
        'marketing_spends',
        ['project_id'],
        unique=False,
    )
    op.create_index(
        'ix_marketing_spends_project_id_period',
        'marketing_spends',
        ['project_id', 'period_start'],
        unique=False,
    )
    op.create_index(
        op.f('ix_marketing_spends_source'),
        'marketing_spends',
        ['source'],
        unique=False,
    )
    op.create_index(
        'ix_marketing_spends_source_period',
        'marketing_spends',
        ['source', 'period_start', 'period_end'],
        unique=False,
    )
    op.create_index(
        op.f('ix_marketing_spends_period_start'),
        'marketing_spends',
        ['period_start'],
        unique=False,
    )


def downgrade() -> None:
    """Revert the migration."""
    op.drop_index(
        op.f('ix_marketing_spends_period_start'),
        table_name='marketing_spends',
    )
    op.drop_index(
        'ix_marketing_spends_source_period',
        table_name='marketing_spends',
    )
    op.drop_index(
        op.f('ix_marketing_spends_source'),
        table_name='marketing_spends',
    )
    op.drop_index(
        'ix_marketing_spends_project_id_period',
        table_name='marketing_spends',
    )
    op.drop_index(
        op.f('ix_marketing_spends_project_id'),
        table_name='marketing_spends',
    )
    op.drop_index(
        op.f('ix_marketing_spends_created_at'),
        table_name='marketing_spends',
    )
    op.drop_table('marketing_spends')
