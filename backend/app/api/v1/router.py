from fastapi import APIRouter
from app.movies.router import router as movies_router
from app.users.router import router as auth_router

api_router = APIRouter()
api_router.include_router(movies_router)
api_router.include_router(auth_router)