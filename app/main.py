from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database.connection import Base, engine, get_db
from app import models
from app.schemas import UserCreate, UserLogin
from app.models import User
from app.utils import get_password_hash, verify_password, create_access_token
import os
from fastapi.security import OAuth2PasswordBearer
from fastapi import status
from app.services.huggingface import query_huggingface
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()


app = FastAPI()


app.mount("/resources", StaticFiles(directory="C:/AI WEB APP 1/resources"), name="resources")

# Create database tables
Base.metadata.create_all(bind=engine)

# Mount frontend directory for static files
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Serve index.html as default route
@app.get("/", response_class=FileResponse)
def serve_index():
    return FileResponse("frontend/index.html")


@app.post("/api/auth/signup/")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(
        (User.username == user.username) | 
        (User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),  # Using hashed_password to match mode
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@app.post("/api/auth/login/")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": db_user.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": db_user.id
    }



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login/")

@app.get("/chat", response_class=FileResponse)
async def serve_chat():
    return FileResponse("frontend/chat.html")



@app.get("/login", response_class=FileResponse)
def serve_login():
    return FileResponse("frontend/index.html")


class ChatRequest(BaseModel):
    message: str

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/api/chat/")
def chat_with_ai(request: ChatRequest, token: str = Depends(oauth2_scheme)):
    try:
        logger.info(f"Received chat request: {request.message}")
        response = query_huggingface(request.message)
        logger.info(f"AI response: {response}")
        return {"reply": response}
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods including OPTIONS
    allow_headers=["*"],
)