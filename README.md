# UniPilot - AI Assignment Planner & Prioritizer

An AI-powered web application designed to automate academic planning, reduce student overwhelm, and optimize time management through intelligent automation and machine learning.

## Features

### Core Features
- **Automated Task Extraction** - Upload syllabi PDFs and let AI extract assignments, deadlines, and requirements
- **ML-Based Prioritization** - Intelligent task prioritization based on urgency, effort, and grade weight
- **Smart Schedule Generation** - Auto-generates daily/weekly schedules with Pomodoro breaks
- **Google Calendar Integration** - One-click sync to keep your calendar updated
- **Collaborative Projects** - Share projects with group members and track progress

## Tech Stack

### Frontend
- **Next.js 16** - React framework
- **Material-UI** - Component library
- **Firebase Auth** - Google OAuth authentication
- **Axios** - API client

### Backend
- **FastAPI** - Python web framework
- **LangChain + Gemini** - AI-powered syllabus parsing
- **scikit-learn** - ML-based prioritization
- **Firebase Admin** - Firestore database
- **Google Calendar API** - Calendar synchronization

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Firebase project
- Google Gemini API key
- Google Calendar API credentials (optional)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
```

3. Activate virtual environment:
```bash
# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

6. Add your API keys to `.env`:
- `GOOGLE_GEMINI_API_KEY`
- Firebase service account JSON path
- Google Calendar credentials (optional)

7. Place Firebase service account key:
- Download from Firebase Console
- Save as `app/serviceAccountKey.json`

8. Run the server:
```bash
python -m app.main
```

Backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file (copy from `.env.local.example`):
```bash
cp .env.local.example .env.local
```

4. Add your Firebase config to `.env.local`

5. Run the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## Usage

1. **Sign In** - Use Google OAuth to sign in
2. **Upload Syllabus** - Go to Upload page and upload your course syllabus PDF
3. **Review Tasks** - AI will extract tasks automatically
4. **Generate Schedule** - Create a personalized study schedule
5. **Sync Calendar** - Connect Google Calendar and sync your tasks
6. **Collaborate** - Create group projects and invite team members

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
unipilot/
├── backend/
│   ├── app/
│   │   ├── config/         # Configuration
│   │   ├── models/         # Pydantic models
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI app
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── lib/            # Utilities
│   │   └── config/         # Firebase config
│   ├── package.json
│   └── .env.local.example
└── README.md
```

## Contributing

This is a hackathon project. Feel free to fork and improve!

## License

MIT License
