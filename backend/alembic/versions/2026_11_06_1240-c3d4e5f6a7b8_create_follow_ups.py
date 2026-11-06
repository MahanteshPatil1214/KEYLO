"""create follow ups table

Revision ID: c3d4e5f6a7b8
Revises: b1f2c3d4e5a6
Create Date: 2026-11-06 12:40:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b1f2c3d4e5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply the migration."""
    op.create_table(
        'follow_ups',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('lead_id', sa.Uuid(), nullable=False),
        sa.Column('project_id', sa.Uuid(), nullable=False),
        sa.Column('executive_id', sa.Uuid(), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('type', sa.String(length=32), nullable=False),
        sa.Column('priority', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('notes', sa.String(length=1000), nullable=True),
        sa.Column('next_action', sa.String(length=500), nullable=True),
        sa.Column('outcome', sa.String(length=32), nullable=True),
        sa.Column('outcome_notes', sa.String(length=1000), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ['lead_id'],
            ['leads.id'],
            name=op.f('fk_follow_ups_lead_id_leads'),
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['project_id'],
            ['projects.id'],
            name=op.f('fk_follow_ups_project_id_projects'),
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['executive_id'],
            ['users.id'],
            name=op.f('fk_follow_ups_executive_id_users'),
            ondelete='RESTRICT',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_follow_ups')),
        sa.CheckConstraint(
            "type IN ('CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'OTHER')",
            name=op.f('ck_follow_ups_type'),
        ),
        sa.CheckConstraint(
            "priority IN ('LOW', 'MEDIUM', 'HIGH')",
            name=op.f('ck_follow_ups_priority'),
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'COMPLETED', 'CANCELLED')",
            name=op.f('ck_follow_ups_status'),
        ),
        sa.CheckConstraint(
            "outcome IS NULL OR outcome IN ('INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE', 'CALLBACK_REQUESTED', 'CONVERTED')",
            name=op.f('ck_follow_ups_outcome'),
        ),
    )
    op.create_index(
        op.f('ix_follow_ups_lead_id_scheduled_at'),
        'follow_ups',
        ['lead_id', 'scheduled_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_follow_ups_executive_id_scheduled_at'),
        'follow_ups',
        ['executive_id', 'scheduled_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_follow_ups_project_id_scheduled_at'),
        'follow_ups',
        ['project_id', 'scheduled_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_follow_ups_status_scheduled_at'),
        'follow_ups',
        ['status', 'scheduled_at'],
        unique=False,
    )


def downgrade() -> None:
    """Revert the migration."""
    op.drop_index(op.f('ix_follow_ups_status_scheduled_at'), table_name='follow_ups')
    op.drop_index(op.f('ix_follow_ups_project_id_scheduled_at'), table_name='follow_ups')
    op.drop_index(op.f('ix_follow_ups_executive_id_scheduled_at'), table_name='follow_ups')
    op.drop_index(op.f('ix_follow_ups_lead_id_scheduled_at'), table_name='follow_ups')
    op.drop_table('follow_ups')
