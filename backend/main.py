import os
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from fastapi import Response

from core.database import connect_to_mongo, close_mongo_connection, get_collection
from data.schemas import (
    AnalyzeRequest, SkillGapResult, LearningRoadmap, ResumeData,
    AnalysisResponse, CareerReport, ParsedResumeResponse,
    ContactInfoSchema, EducationEntrySchema, ExperienceEntrySchema
)
from data.models import ResumeDoc, SkillAnalysisDoc, CareerReportDoc
from services.job_market_service import get_job_roles, get_job_skills, load_mock_jobs
from services.resume_service import extract_text_from_pdf, extract_skills, parse_resume
from services.analysis_service import compare_skills, get_full_skill_gap
from services.roadmap_service import generate_roadmap
from services.career_service import generate_career_report
from services.overview_service import get_overview_stats, get_recent_analyses

app = FastAPI(title="Gap2Grow API")

# Allow all origins for local hackathon dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

@app.get("/")
def read_root():
    return {"message": "Welcome to Gap2Grow API"}

@app.head("/health")
def health_head(response: Response):
    return Response(status_code=200)


@app.get("/api/overview", response_model=dict)
async def api_get_overview():
    """
    Returns aggregated statistics from all stored analyses and resumes.
    Used to power the Overview dashboard page.
    """
    analyses_col = get_collection("analyses")
    resumes_col  = get_collection("resumes")
    return await get_overview_stats(analyses_col, resumes_col)

@app.get("/api/recent-analyses", response_model=list)
async def api_get_recent_analyses(limit: int = 8):
    """
    Returns the most recent analyses (newest first) for the activity feed.
    """
    analyses_col = get_collection("analyses")
    return await get_recent_analyses(analyses_col, limit=limit)

@app.get("/api/job-roles", response_model=List[str])
def api_get_job_roles():
    """Returns available mock job roles."""
    return get_job_roles()

@app.get("/api/market-data", response_model=dict)
def api_get_market_data():
    """Returns full mock job market data."""
    return load_mock_jobs()

@app.post("/api/skill-gap", response_model=dict)
async def skill_gap_endpoint(request: AnalyzeRequest):
    """
    Full weighted skill-gap analysis.
    Returns gap score, matched/missing skills (priority-sorted),
    extra skills, match_details for charts, and market forecast metrics.
    Persists results to MongoDB.
    """
    data = get_full_skill_gap(request.skills, request.target_role)

    # Persist to MongoDB
    try:
        col = get_collection("analyses")
        doc = SkillAnalysisDoc(
            target_role    = data["target_role"],
            user_skills    = data["user_skills"],
            missing_skills = data["missing_skills"],
            gap_score      = data["gap_score"],
        )
        result = await col.insert_one(doc.dict(by_alias=True, exclude={"id"}))
        data["analysis_id"] = str(result.inserted_id)
    except Exception as e:
        print(f"[skill-gap] DB write failed: {e}")
        data["analysis_id"] = None

    return data


@app.post("/api/parse-resume", response_model=ParsedResumeResponse)
async def parse_resume_endpoint(file: UploadFile = File(...)):
    """
    Full autonomous resume parser.
    Extracts contact info, categorised skills (250+ skill DB), education,
    work experience, and total years of experience from a PDF resume.
    Saves the parsed resume to MongoDB and returns structured JSON.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    import uuid
    temp_path = f"temp_{uuid.uuid4().hex}_{file.filename}"
    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        # Run the full parser pipeline
        try:
            parsed = parse_resume(temp_path)
        except ValueError as ve:
            # If the ValueError carries a structured reason dict, propagate it as the detail
            reason = ve.args[0] if ve.args else str(ve)
            raise HTTPException(status_code=400, detail=reason)

        # Persist to MongoDB
        resumes_col = get_collection("resumes")
        resume_doc  = ResumeDoc(
            filename         = file.filename,
            text_content     = parsed.raw_text,
            extracted_skills = parsed.all_skills,
        )
        result    = await resumes_col.insert_one(resume_doc.dict(by_alias=True, exclude={"id"}))
        resume_id = str(result.inserted_id)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[parse-resume] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return ParsedResumeResponse(
        resume_id          = resume_id,
        filename           = file.filename,
        contact            = ContactInfoSchema(
            email    = parsed.contact.email,
            phone    = parsed.contact.phone,
            linkedin = parsed.contact.linkedin,
            github   = parsed.contact.github,
        ),
        categorized_skills = parsed.categorized_skills,
        all_skills         = parsed.all_skills,
        education          = [
            EducationEntrySchema(raw=e.raw, degree=e.degree, years=e.years)
            for e in parsed.education
        ],
        experience         = [
            ExperienceEntrySchema(raw=e.raw, title=e.title, years=e.years)
            for e in parsed.experience
        ],
        total_exp_years    = parsed.total_exp_years,
        sections_found     = parsed.sections_found,
        text_preview       = parsed.raw_text[:600].strip(),
        skill_count        = len(parsed.all_skills),
    )


@app.post("/api/upload-resume", response_model=dict)
async def upload_resume(file: UploadFile = File(...)):
    """Handles PDF resume upload, extracts skills, and saves to MongoDB."""
    print(f"Received file: {file.filename}")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        text = extract_text_from_pdf(temp_file_path)
        # Reject non-resume PDFs early
        from services.resume_service import _is_likely_resume
        is_like, reason = _is_likely_resume(text)
        if not is_like:
            # reason is a dict; raise with that detail so frontend can display specific message
            raise HTTPException(status_code=400, detail=reason)
        skills = extract_skills(text)
        
        # Save to DB
        resumes_collection = get_collection("resumes")
        resume_doc = ResumeDoc(
            filename=file.filename,
            text_content=text,
            extracted_skills=skills
        )
        result = await resumes_collection.insert_one(resume_doc.dict(by_alias=True, exclude={"id"}))
        resume_id = str(result.inserted_id)

    except Exception as e:
        print(f"Error during file processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        
    return {
        "id": resume_id,
        "resume_data": ResumeData(
            text_content=text[:500] + "...", # Truncated for response
            extracted_skills=skills
        ).dict()
    }


@app.post("/api/parse-text", response_model=ParsedResumeResponse)
async def parse_text_endpoint(payload: dict = Body(...)):
    """
    Parse provided raw text (used for DOC/DOCX uploads where Node extracts text).
    Expects JSON: { "text": "...", "filename": "optional name" }
    """
    text = payload.get('text')
    filename = payload.get('filename', 'uploaded')
    if not text:
        raise HTTPException(status_code=400, detail={"code": "no_text", "message": "No text provided for parsing."})

    try:
        from services.resume_service import parse_resume_from_text
        parsed = parse_resume_from_text(text, filename=filename)
    except ValueError as ve:
        reason = ve.args[0] if ve.args else str(ve)
        raise HTTPException(status_code=400, detail=reason)
    except Exception as e:
        print(f"[parse-text] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Text parsing failed: {str(e)}")

    # Persist to MongoDB as in file-based parser
    try:
        resumes_col = get_collection("resumes")
        resume_doc = ResumeDoc(
            filename=filename,
            text_content=parsed.raw_text,
            extracted_skills=parsed.all_skills,
        )
        result = await resumes_col.insert_one(resume_doc.dict(by_alias=True, exclude={"id"}))
        resume_id = str(result.inserted_id)
    except Exception as e:
        print(f"[parse-text] DB write failed: {e}")
        resume_id = None

    return ParsedResumeResponse(
        resume_id=resume_id,
        filename=filename,
        contact=ContactInfoSchema(
            email=parsed.contact.email,
            phone=parsed.contact.phone,
            linkedin=parsed.contact.linkedin,
            github=parsed.contact.github,
        ),
        categorized_skills=parsed.categorized_skills,
        all_skills=parsed.all_skills,
        education=[
            EducationEntrySchema(raw=e.raw, degree=e.degree, years=e.years)
            for e in parsed.education
        ],
        experience=[
            ExperienceEntrySchema(raw=e.raw, title=e.title, years=e.years)
            for e in parsed.experience
        ],
        total_exp_years=parsed.total_exp_years,
        sections_found=parsed.sections_found,
        text_preview=parsed.raw_text[:600].strip(),
        skill_count=len(parsed.all_skills),
    )

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_skills_endpoint(request: AnalyzeRequest):
    """
    Analyzes skills against a target role, computes gap score,
    generates roadmap and career report, and saves them to MongoDB.
    """
    # 1. Compare skills
    gap_result = compare_skills(request.skills, request.target_role)
    
    # 2. Generate roadmap
    roadmap = generate_roadmap(gap_result)
    
    # 3. Generate career report
    report_dict = generate_career_report(request.target_role, gap_result.gap_score)
    report = CareerReport(**report_dict)

    # 4. Save to DB asynchronously
    try:
        analysis_col = get_collection("analyses")
        analysis_doc = SkillAnalysisDoc(
            target_role=request.target_role,
            user_skills=gap_result.user_skills,
            missing_skills=gap_result.missing_skills,
            gap_score=gap_result.gap_score
        )
        analysis_result = await analysis_col.insert_one(analysis_doc.dict(by_alias=True, exclude={"id"}))
        
        report_col = get_collection("reports")
        report_doc = CareerReportDoc(
            analysis_id=str(analysis_result.inserted_id),
            career_trajectory=report.trajectory,
            salary_expectation=report.salary_expectation,
            market_demand=report.market_demand
        )
        await report_col.insert_one(report_doc.dict(by_alias=True, exclude={"id"}))
        
    except Exception as e:
        print(f"Failed to persist analysis to Database: {e}")
        # Note: In a hackathon setting we might still want to return the result even if DB fails.
    
    return AnalysisResponse(
        analysis=gap_result,
        roadmap=roadmap,
        report=report
    )
