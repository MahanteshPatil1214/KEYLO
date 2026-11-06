"""API v1 router composition."""

from fastapi import APIRouter

from app.api.v1.endpoints import health
from app.modules.ai_assistant.router import router as ai_assistant_router
from app.modules.auth.router import router as auth_router
from app.modules.bookings.router import bookings_router, slots_router
from app.modules.conversations.router import router as conversations_router
from app.modules.dashboard.router import router as dashboard_router
from app.modules.follow_ups.router import router as follow_ups_router
from app.modules.handoffs.router import handoffs_router
from app.modules.leads.router import router as leads_router
from app.modules.messages.router import router as messages_router
from app.modules.notifications.router import notifications_router
from app.modules.projects.router import router as projects_router
from app.modules.users.router import router as users_router

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(projects_router)
api_router.include_router(leads_router)
api_router.include_router(conversations_router)
api_router.include_router(messages_router)
api_router.include_router(ai_assistant_router)
api_router.include_router(slots_router)
api_router.include_router(bookings_router)
api_router.include_router(follow_ups_router)
api_router.include_router(handoffs_router)
api_router.include_router(notifications_router)
api_router.include_router(dashboard_router)
