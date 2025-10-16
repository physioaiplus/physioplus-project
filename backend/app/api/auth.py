"""
Router per autenticazione
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.core.database import firebase_manager

auth_router = APIRouter(prefix="/api/auth", tags=["auth"])

async def verify_firebase_token(token: str):
    """Dipendenze per verifica token Firebase"""
    try:
        decoded_token = await firebase_manager.verify_token(token)
        return decoded_token
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@auth_router.post("/verify")
async def verify_token(token: str = Depends(verify_firebase_token)):
    """Verifica token e restituisce info utente"""
    return {
        "success": True,
        "user_id": token.get("uid"),
        "email": token.get("email"),
        "verified": token.get("email_verified", False)
    }

@auth_router.post("/refresh")
async def refresh_token():
    """Rinnova token (da implementare)"""
    raise HTTPException(status_code=501, detail="Non implementato")

@auth_router.post("/logout")
async def logout():
    """Logout (no-op per token JWT)"""
    return {"success": True, "message": "Logout effettuato"}


