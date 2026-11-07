"""create system settings, notification templates, and audit logs tables

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-11-07 12:00:00.000000

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply the migration."""
    # 1. System Settings table
    op.create_table(
        'system_settings',
        sa.Column('key', sa.String(length=64), nullable=False),
        sa.Column('category', sa.String(length=32), nullable=False),
        sa.Column('value', sa.JSON(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('updated_by_id', sa.Uuid(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('key')
    )
    op.create_index(op.f('ix_system_settings_category'), 'system_settings', ['category'], unique=False)

    # 2. Notification Templates table
    op.create_table(
        'notification_templates',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('type', sa.String(length=64), nullable=False),
        sa.Column('channel', sa.String(length=32), nullable=False),
        sa.Column('title_template', sa.String(length=255), nullable=False),
        sa.Column('body_template', sa.Text(), nullable=False),
        sa.Column('variables', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('updated_by_id', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_templates_channel'), 'notification_templates', ['channel'], unique=False)
    op.create_index(op.f('ix_notification_templates_type'), 'notification_templates', ['type'], unique=False)

    # 3. Audit Logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('actor_id', sa.Uuid(), nullable=True),
        sa.Column('actor_name', sa.String(length=255), nullable=False),
        sa.Column('actor_email', sa.String(length=255), nullable=False),
        sa.Column('resource_type', sa.String(length=64), nullable=False),
        sa.Column('resource_id', sa.String(length=128), nullable=True),
        sa.Column('details', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_actor_id'), 'audit_logs', ['actor_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_logs_resource_type'), 'audit_logs', ['resource_type'], unique=False)


def downgrade() -> None:
    """Revert the migration."""
    op.drop_index(op.f('ix_audit_logs_resource_type'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_actor_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_table('audit_logs')

    op.drop_index(op.f('ix_notification_templates_type'), table_name='notification_templates')
    op.drop_index(op.f('ix_notification_templates_channel'), table_name='notification_templates')
    op.drop_table('notification_templates')

    op.drop_index(op.f('ix_system_settings_category'), table_name='system_settings')
    op.drop_table('system_settings')

