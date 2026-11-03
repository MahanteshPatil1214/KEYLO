"""HTTP endpoints for direct message queries."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import CurrentUser
from app.modules.conversations.schemas import MessageResponse
from app.modules.conversations.service import get_message

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get(
    "/{message_id}",
    response_model=MessageResponse,
    summary="Get message detail",
)
def get_message_endpoint(
    message_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    """Return an individual message if authorized to view its conversation."""

    return get_message(db, actor=current_user, message_id=message_id)

