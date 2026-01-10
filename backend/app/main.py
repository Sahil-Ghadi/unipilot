from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.routes import auth, tasks, syllabus, schedule, calendar, projects, notifications
import socketio

# Import Socket.IO server
from app.websocket.chat import sio

# Create FastAPI app
app = FastAPI(
    title="UniPilot API",
    description="AI-powered assignment planner and prioritizer for students",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]  # Expose all response headers
)

# Include routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(syllabus.router)
app.include_router(schedule.router)
app.include_router(calendar.router)
app.include_router(projects.router)
app.include_router(notifications.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to UniPilot API",
        "version": "1.0.0",
        "docs": "/docs",
        "socketio": "Socket.IO available at /socket.io/"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Combine FastAPI and Socket.IO into single ASGI app
socket_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app
)

asgi_app = socket_app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:asgi_app",
        host="0.0.0.0",
        port=8000,   
        reload=False,
        log_level="info"
    )





