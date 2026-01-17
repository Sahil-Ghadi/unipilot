from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.routes import auth, tasks, syllabus, schedule, calendar, projects, notifications, graph, chat, classroom, upload
import socketio
import time
import traceback

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
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://unipilottt.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests and responses for debugging"""
    start_time = time.time()
    
    print(f"\n{'='*60}")
    print(f"📥 Incoming Request: {request.method} {request.url.path}")
    print(f"Headers: {dict(request.headers)}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        print(f"✅ Response Status: {response.status_code}")
        print(f"⏱️  Process Time: {process_time:.2f}s")
        print(f"{'='*60}\n")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        print(f"❌ Request Failed: {str(e)}")
        print(f"⏱️  Process Time: {process_time:.2f}s")
        print(f"Stack Trace:\n{traceback.format_exc()}")
        print(f"{'='*60}\n")
        raise

# Startup event to verify Firebase initialization
@app.on_event("startup")
async def startup_event():
    """Verify Firebase and other services on startup"""
    print("\n" + "="*60)
    print("🚀 Starting UniPilot API...")
    print("="*60)
    
    # Test Firebase initialization
    try:
        from app.services.firebase_service import FirebaseService
        firebase_service = FirebaseService(settings.firebase_credentials_path)
        print("✅ Firebase Admin SDK initialized successfully")
        print("✅ Firestore client ready")
    except Exception as e:
        print(f"❌ Firebase initialization failed: {str(e)}")
        print(f"Stack trace:\n{traceback.format_exc()}")
        print("⚠️  API will start but authentication will fail!")
    
    print("✅ Server is ready to accept requests")
    print("="*60 + "\n")

# Include routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(schedule.router)
app.include_router(calendar.router)
app.include_router(notifications.router)
app.include_router(syllabus.router)
app.include_router(graph.router)
app.include_router(chat.router)
app.include_router(classroom.router)
app.include_router(upload.router)


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

# Apply CORS middleware to the top-level ASGI app to ensure it runs before Socket.IO
# This fixes potential CORS issues where Socket.IO might interfere with OPTIONS requests
app_with_cors = CORSMiddleware(
    socket_app,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://unipilottt.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting UniPilot API with WebSocket support...")
    print("📡 Socket.IO endpoint: http://localhost:8000/socket.io/")
    print("📚 API docs: http://localhost:8000/docs")
    uvicorn.run(
        app_with_cors,  # Run the CORS-wrapped app
        host=settings.host,
        port=settings.port,
        reload=False,  # Disable reload for now to test
        log_level="info"
    )

# Force reload

