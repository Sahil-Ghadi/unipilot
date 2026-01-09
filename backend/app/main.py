from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.routes import auth, tasks, syllabus, schedule, calendar, projects

# Create FastAPI app
app = FastAPI(
    title="UniPilot API",
    description="AI-powered assignment planner and prioritizer for students",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(syllabus.router)
app.include_router(schedule.router)
app.include_router(calendar.router)
app.include_router(projects.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to UniPilot API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
