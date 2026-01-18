from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
import secrets

from app.config.settings import settings
from app.routes.auth import get_current_user
from app.services.firebase_service import FirebaseService
from app.services.google_classroom_service import GoogleClassroomService
from app.services.rag_service import RAGService

router = APIRouter(prefix="/api/classroom", tags=["classroom"])

firebase_service = FirebaseService(settings.firebase_credentials_path)
classroom_service = GoogleClassroomService(
    client_id=settings.google_classroom_client_id,
    client_secret=settings.google_classroom_client_secret,
    redirect_uri=settings.google_classroom_redirect_uri,
)
rag_service = RAGService()


@router.get("/auth-url")
async def get_auth_url(current_user: dict = Depends(get_current_user)):
    try:
        if not settings.google_classroom_client_id or not settings.google_classroom_client_secret:
            raise HTTPException(status_code=500, detail="Google Classroom OAuth is not configured")
        state = f"{current_user['id']}:{secrets.token_urlsafe(16)}"
        auth_url = classroom_service.get_authorization_url(state)
        return {"auth_url": auth_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/callback")
async def classroom_callback(code: str, state: str):
    try:
        user_id = state.split(':')[0]
        tokens = classroom_service.exchange_code_for_tokens(code)
        firebase_service.store_google_classroom_tokens(user_id, tokens)
        return RedirectResponse(url=f"{settings.frontend_url}/chat?classroom_connected=true")
    except Exception:
        return RedirectResponse(url=f"{settings.frontend_url}/chat?classroom_error=true")


@router.get("/status")
async def get_status(current_user: dict = Depends(get_current_user)):
    try:
        tokens = firebase_service.get_google_classroom_tokens(current_user['id'])
        return {
            "connected": bool(tokens),
            "connected_at": tokens.get('connected_at') if tokens else None,
            "scopes": tokens.get('scopes') if tokens else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disconnect")
async def disconnect(current_user: dict = Depends(get_current_user)):
    try:
        firebase_service.delete_google_classroom_tokens(current_user['id'])
        return {"message": "Classroom disconnected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses")
async def list_courses(current_user: dict = Depends(get_current_user)):
    tokens = firebase_service.get_google_classroom_tokens(current_user['id'])
    if not tokens:
        raise HTTPException(status_code=400, detail="Google Classroom not connected")

    try:
        svc = classroom_service.get_classroom_service(tokens)
        courses = classroom_service.list_courses(svc)
        return {
            "courses": [
                {
                    "id": c.get('id'),
                    "name": c.get('name'),
                    "section": c.get('section'),
                    "room": c.get('room'),
                }
                for c in courses
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=classroom_service.safe_google_error(e))


@router.post("/sync-materials")
async def sync_materials(payload: dict, current_user: dict = Depends(get_current_user)):
    tokens = firebase_service.get_google_classroom_tokens(current_user['id'])
    if not tokens:
        raise HTTPException(status_code=400, detail="Google Classroom not connected")

    course_id = payload.get('course_id')

    try:
        classroom_svc = classroom_service.get_classroom_service(tokens)
        drive_svc = classroom_service.get_drive_service(tokens)

        if course_id:
            try:
                course = classroom_service.get_course(classroom_svc, course_id)
                courses = [course]
            except Exception:
                courses = [{"id": course_id}]
        else:
            courses = classroom_service.list_courses(classroom_svc)

        indexed = 0
        skipped = 0
        errors = []

        for c in courses:
            cid = c.get('id')
            if not cid:
                continue

            course_display_name = c.get('name') or cid

            try:
                materials = classroom_service.list_coursework_materials(classroom_svc, cid)
            except Exception as e:
                errors.append(f"course {cid}: {classroom_service.safe_google_error(e)}")
                continue

            for item in materials:
                course_name = course_display_name
                drive_files = classroom_service.extract_drive_file_ids(item)

                for f in drive_files:
                    file_id = f.get('id')
                    title = f.get('title') or file_id

                    try:
                        meta = classroom_service.get_drive_file_metadata(drive_svc, file_id)
                        if not classroom_service.is_pdf_file(meta.get('name'), meta.get('mimeType')):
                            skipped += 1
                            continue

                        pdf_bytes = classroom_service.download_drive_file(drive_svc, file_id)
                        result = await rag_service.index_pdf_bytes(
                            pdf_bytes=pdf_bytes,
                            user_id=current_user['id'],
                            course_name=str(course_name),
                            document_name=str(meta.get('name') or title),
                        )
                        if result.get('success'):
                            indexed += 1
                        else:
                            errors.append(f"{title}: {result.get('error')}")
                    except Exception as e:
                        errors.append(f"{title}: {classroom_service.safe_google_error(e)}")

        return {
            "message": f"Indexed {indexed} PDFs. Skipped {skipped} non-PDF files.",
            "indexed": indexed,
            "skipped": skipped,
            "errors": errors if errors else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=classroom_service.safe_google_error(e))
