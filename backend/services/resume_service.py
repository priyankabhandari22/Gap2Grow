"""
resume_service.py
-----------------
Autonomous resume parser that extracts:
  - Raw text from PDF (PyMuPDF)
  - Contact information (email, phone, LinkedIn, GitHub)
  - Detected resume sections (Skills, Experience, Education, etc.)
  - Skills grouped by category (matching against 250+ tech & soft skills)
  - Education entries (degree, institution, year)
  - Work experience entries (title, company, duration)
  - A summary of years of total experience
"""

import fitz  # PyMuPDF
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field

# ─────────────────────────────────────────────────────────────
# COMPREHENSIVE SKILL TAXONOMY  (250+ skills, grouped)
# ─────────────────────────────────────────────────────────────
SKILL_CATEGORIES: Dict[str, List[str]] = {
    "Programming Languages": [
        "python", "java", "javascript", "typescript", "c++", "c#", "c",
        "go", "rust", "swift", "kotlin", "ruby", "php", "scala", "r",
        "matlab", "perl", "shell", "bash", "powershell", "dart", "lua",
        "haskell", "elixir", "clojure", "groovy", "vba",
    ],
    "Web & Frontend": [
        "react", "angular", "vue", "vue.js", "next.js", "nuxt.js",
        "svelte", "html", "css", "sass", "less", "tailwind", "bootstrap",
        "jquery", "redux", "graphql", "rest apis", "restful", "websockets",
        "webpack", "vite", "babel", "gatsby", "hugo",
    ],
    "Backend & APIs": [
        "node.js", "express", "fastapi", "django", "flask", "spring boot",
        "spring", "laravel", "rails", "asp.net", ".net", "gin", "fastify",
        "nestjs", "grpc", "soap", "microservices", "serverless",
    ],
    "Databases & Storage": [
        "sql", "mysql", "postgresql", "sqlite", "oracle", "mssql",
        "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb",
        "firebase", "supabase", "neo4j", "influxdb", "couchdb",
        "mariadb", "snowflake", "bigquery", "hive",
    ],
    "Cloud & DevOps": [
        "aws", "azure", "gcp", "google cloud", "docker", "kubernetes",
        "terraform", "ansible", "jenkins", "github actions", "gitlab ci",
        "circleci", "travis ci", "helm", "istio", "prometheus", "grafana",
        "nginx", "apache", "linux", "ubuntu", "centos", "ci/cd",
        "infrastructure as code", "pulumi",
    ],
    "Data Science & ML": [
        "machine learning", "deep learning", "neural networks", "nlp",
        "computer vision", "pandas", "numpy", "scipy", "scikit-learn",
        "tensorflow", "keras", "pytorch", "xgboost", "lightgbm",
        "data analysis", "data visualization", "statistics", "jupyter",
        "matplotlib", "seaborn", "plotly", "tableau", "power bi",
        "apache spark", "hadoop", "airflow", "mlflow", "hugging face",
        "langchain", "llm", "openai", "bert", "transformers",
    ],
    "Mobile": [
        "android", "ios", "react native", "flutter", "swift", "kotlin",
        "objective-c", "xamarin", "ionic", "cordova",
    ],
    "Security": [
        "cybersecurity", "penetration testing", "ethical hacking", "owasp",
        "ssl", "oauth", "jwt", "sso", "iam", "siem", "firewall",
        "vulnerability assessment", "network security", "cryptography",
    ],
    "Tools & Platforms": [
        "git", "github", "gitlab", "bitbucket", "jira", "confluence",
        "slack", "notion", "figma", "adobe xd", "postman", "unix",
        "vs code", "intellij", "eclipse", "xcode", "android studio",
    ],
    "Methodologies": [
        "agile", "scrum", "kanban", "lean", "devops", "tdd", "bdd",
        "ci/cd", "waterfall", "six sigma", "design thinking",
    ],
    "Soft Skills": [
        "leadership", "communication", "teamwork", "problem solving",
        "critical thinking", "time management", "project management",
        "collaboration", "presentation", "mentoring", "negotiation",
        "customer service", "analytical thinking", "adaptability",
    ],
    "Business & PM": [
        "product management", "product roadmap", "market research",
        "wireframing", "user stories", "stakeholder management",
        "risk management", "business analysis", "data-driven",
        "a/b testing", "kpis", "okrs", "roadmap", "go-to-market",
    ],
}

# Flat list (lowercase) → canonical display name for fast lookup
_SKILL_LOWER_TO_CANONICAL: Dict[str, str] = {}
_SKILL_LOWER_TO_CATEGORY:  Dict[str, str] = {}
for _cat, _skills in SKILL_CATEGORIES.items():
    for _s in _skills:
        _sl = _s.lower()
        _SKILL_LOWER_TO_CANONICAL[_sl] = _s
        _SKILL_LOWER_TO_CATEGORY[_sl]  = _cat

# ─────────────────────────────────────────────────────────────
# SECTION HEADERS  (used to split the resume into sections)
# ─────────────────────────────────────────────────────────────
SECTION_PATTERNS = {
    "contact":    re.compile(r'\b(contact|personal info|profile)\b', re.I),
    "summary":    re.compile(r'\b(summary|objective|about me|profile|overview)\b', re.I),
    "skills":     re.compile(r'\b(skills?|technical skills?|core competenc|expertise|proficienc)\b', re.I),
    "experience": re.compile(r'\b(experience|work history|employment|career|professional background)\b', re.I),
    "education":  re.compile(r'\b(education|academic|qualification|degree|university|college|school)\b', re.I),
    "projects":   re.compile(r'\b(projects?|portfolio|work samples?|personal projects?)\b', re.I),
    "certifications": re.compile(r'\b(certif|license|accreditation|credential)\b', re.I),
    "awards":     re.compile(r'\b(award|achievement|honor|recognition)\b', re.I),
}

# ─────────────────────────────────────────────────────────────
# CONTACT REGEXES
# ─────────────────────────────────────────────────────────────
_EMAIL_RE   = re.compile(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}')
_PHONE_RE   = re.compile(
    r'(?:\+?\d[\d\s\-().]{7,}\d)'
)
_LINKEDIN_RE = re.compile(r'(?:linkedin\.com/in/|linkedin:?\s*)\S+', re.I)
_GITHUB_RE   = re.compile(r'(?:github\.com/|github:?\s*)\S+', re.I)

# ─────────────────────────────────────────────────────────────
# DEGREE / EDUCATION KEYWORDS
# ─────────────────────────────────────────────────────────────
_DEGREE_RE = re.compile(
    r'\b(b\.?s\.?c?|b\.?e\.?|b\.?tech|bachelor|master|m\.?s\.?c?|m\.?e\.?|'
    r'm\.?tech|m\.?b\.?a|ph\.?d|doctorate|associate|diploma|'
    r'b\.?a\.?|m\.?a\.?|llb|llm)\b',
    re.I
)
_YEAR_RANGE_RE = re.compile(r'\b(19|20)\d{2}\s*[-–—to]+\s*(?:(19|20)\d{2}|present|current)\b', re.I)
_YEAR_RE       = re.compile(r'\b(19|20)\d{2}\b')

# ─────────────────────────────────────────────────────────────
# JOB TITLE KEYWORDS
# ─────────────────────────────────────────────────────────────
_JOB_TITLE_KEYWORDS = [
    "engineer", "developer", "analyst", "scientist", "architect",
    "manager", "lead", "director", "consultant", "specialist",
    "designer", "intern", "associate", "head of", "vp of",
    "chief", "officer", "administrator", "coordinator", "researcher",
]
_JOB_TITLE_RE = re.compile(
    r'(?i)\b(' + '|'.join(re.escape(t) for t in _JOB_TITLE_KEYWORDS) + r')\b'
)

# ─────────────────────────────────────────────────────────────
# DATA CLASSES
# ─────────────────────────────────────────────────────────────
@dataclass
class ContactInfo:
    email:    Optional[str] = None
    phone:    Optional[str] = None
    linkedin: Optional[str] = None
    github:   Optional[str] = None

@dataclass
class EducationEntry:
    raw:     str
    degree:  Optional[str] = None
    years:   Optional[str] = None

@dataclass
class ExperienceEntry:
    raw:    str
    title:  Optional[str] = None
    years:  Optional[str] = None

@dataclass
class ParsedResume:
    raw_text:         str
    contact:          ContactInfo
    categorized_skills: Dict[str, List[str]]   # category → [skill, ...]
    all_skills:       List[str]                 # flat canonical list
    education:        List[EducationEntry]
    experience:       List[ExperienceEntry]
    total_exp_years:  Optional[float]
    sections_found:   List[str]


# ─────────────────────────────────────────────────────────────
# PDF TEXT EXTRACTION
# ─────────────────────────────────────────────────────────────
def extract_text_from_pdf(file_path: str) -> str:
    """Extracts raw text from a PDF file using PyMuPDF."""
    text = ""
    try:
        with fitz.open(file_path) as doc:
            for page in doc:
                # Use 'text' mode for body text; 'blocks' would give layout
                text += page.get_text("text") + "\n"
    except Exception as e:
        print(f"[ResumeService] PDF extraction error: {e}")
    return text


# ─────────────────────────────────────────────────────────────
# CONTACT EXTRACTION
# ─────────────────────────────────────────────────────────────
def _extract_contact(text: str) -> ContactInfo:
    email    = (_EMAIL_RE.search(text) or [None])[0] if _EMAIL_RE.search(text) else None
    phone_m  = _PHONE_RE.search(text)
    linkedin = (_LINKEDIN_RE.search(text).group(0) if _LINKEDIN_RE.search(text) else None)
    github   = (_GITHUB_RE.search(text).group(0)   if _GITHUB_RE.search(text)   else None)

    phone = None
    if phone_m:
        candidate = re.sub(r'[^\d+]', '', phone_m.group(0))
        if len(candidate) >= 7:
            phone = phone_m.group(0).strip()

    return ContactInfo(email=email, phone=phone, linkedin=linkedin, github=github)


# ─────────────────────────────────────────────────────────────
# SECTION SPLITTING
# ─────────────────────────────────────────────────────────────
def _split_into_sections(text: str) -> Dict[str, str]:
    """
    Splits resume text into named sections by detecting header lines.
    Returns a dict { section_name: section_text }.
    """
    lines = text.split('\n')
    sections: Dict[str, str] = {'_preamble': ''}
    current_section = '_preamble'
    section_lines: Dict[str, List[str]] = {current_section: []}

    for line in lines:
        stripped = line.strip()
        if not stripped:
            section_lines[current_section].append(line)
            continue

        # Check if this short line (≤5 words) matches a section header
        word_count = len(stripped.split())
        matched_section = None
        if word_count <= 5:
            for section, pattern in SECTION_PATTERNS.items():
                if pattern.search(stripped):
                    matched_section = section
                    break

        if matched_section:
            current_section = matched_section
            if current_section not in section_lines:
                section_lines[current_section] = []
        else:
            section_lines[current_section].append(line)

    return {k: '\n'.join(v) for k, v in section_lines.items()}


# ─────────────────────────────────────────────────────────────
# SKILL EXTRACTION
# ─────────────────────────────────────────────────────────────
def _extract_skills_from_text(text: str) -> Dict[str, List[str]]:
    """
    Matches skills against the full text (case-insensitive, word-boundary aware).
    Returns {category: [canonical_skill, ...]}
    """
    text_lower = text.lower()
    found_by_category: Dict[str, List[str]] = {}

    for skill_lower, canonical in _SKILL_LOWER_TO_CANONICAL.items():
        # Word-boundary aware matching; handle special chars in skill names
        pattern = r'(?<![a-zA-Z0-9])' + re.escape(skill_lower) + r'(?![a-zA-Z0-9])'
        if re.search(pattern, text_lower):
            cat = _SKILL_LOWER_TO_CATEGORY[skill_lower]
            found_by_category.setdefault(cat, [])
            if canonical not in found_by_category[cat]:
                found_by_category[cat].append(canonical)

    return found_by_category


# ─────────────────────────────────────────────────────────────
# EDUCATION EXTRACTION
# ─────────────────────────────────────────────────────────────
def _extract_education(sections: Dict[str, str]) -> List[EducationEntry]:
    edu_text = sections.get('education', '') + '\n' + sections.get('_preamble', '')
    entries = []
    lines = [l.strip() for l in edu_text.split('\n') if l.strip()]

    for line in lines:
        degree_m = _DEGREE_RE.search(line)
        if degree_m or any(kw in line.lower() for kw in ['university', 'college', 'institute', 'school', 'b.tech', 'b.sc']):
            year_range = (_YEAR_RANGE_RE.search(line) or _YEAR_RE.search(line))
            entries.append(EducationEntry(
                raw    = line,
                degree = degree_m.group(0).strip() if degree_m else None,
                years  = year_range.group(0).strip() if year_range else None,
            ))
        if len(entries) >= 5:
            break

    return entries


# ─────────────────────────────────────────────────────────────
# EXPERIENCE EXTRACTION
# ─────────────────────────────────────────────────────────────
def _extract_experience(sections: Dict[str, str]) -> tuple[List[ExperienceEntry], Optional[float]]:
    exp_text = sections.get('experience', '')
    entries  = []
    total_months = 0

    lines = [l.strip() for l in exp_text.split('\n') if l.strip()]
    for line in lines:
        title_m = _JOB_TITLE_RE.search(line)
        yr_m    = _YEAR_RANGE_RE.search(line)
        if title_m or yr_m:
            entries.append(ExperienceEntry(
                raw   = line,
                title = line if title_m else None,
                years = yr_m.group(0).strip() if yr_m else None,
            ))
            # Try to calculate duration
            if yr_m:
                parts = re.split(r'[-–—to]+', yr_m.group(0), maxsplit=1)
                if len(parts) == 2:
                    start_m = re.search(r'(19|20)\d{2}', parts[0])
                    end_raw  = parts[1].strip().lower()
                    if start_m:
                        start_yr = int(start_m.group(0))
                        if 'present' in end_raw or 'current' in end_raw:
                            end_yr = 2026
                        else:
                            end_m = re.search(r'(19|20)\d{2}', end_raw)
                            end_yr = int(end_m.group(0)) if end_m else start_yr
                        total_months += max(0, (end_yr - start_yr) * 12)
        if len(entries) >= 10:
            break

    total_years = round(total_months / 12, 1) if total_months else None
    return entries, total_years


# ─────────────────────────────────────────────────────────────
# MAIN PARSE FUNCTION
# ─────────────────────────────────────────────────────────────
def parse_resume(file_path: str) -> ParsedResume:
    """
    Full autonomous resume parser pipeline.
    1. Extract raw text from PDF
    2. Split into sections
    3. Extract contact info
    4. Extract and categorize skills
    5. Extract education entries
    6. Extract experience entries + total years
    Returns a ParsedResume dataclass.
    """
    raw_text = extract_text_from_pdf(file_path)

    # Quick heuristic to ensure we only parse résumé documents
    is_like, reason = _is_likely_resume(raw_text)
    if not is_like:
        # reason is a dict {code, message}
        raise ValueError(reason)

    sections       = _split_into_sections(raw_text)
    sections_found = [k for k in sections if k != '_preamble' and sections[k].strip()]

    contact        = _extract_contact(raw_text)
    cat_skills     = _extract_skills_from_text(raw_text)
    all_skills     = [s for skills in cat_skills.values() for s in skills]
    education      = _extract_education(sections)
    experience, total_exp = _extract_experience(sections)

    return ParsedResume(
        raw_text          = raw_text,
        contact           = contact,
        categorized_skills= cat_skills,
        all_skills        = all_skills,
        education         = education,
        experience        = experience,
        total_exp_years   = total_exp,
        sections_found    = sections_found,
    )


def parse_resume_from_text(raw_text: str, filename: str = 'uploaded') -> ParsedResume:
    """
    Parse resume content from a provided raw text string (used by /api/parse-text).
    """
    # Reuse the same pipeline but skip PDF extraction
    if not raw_text or len(raw_text.strip()) < 50:
        raise ValueError({"code": "too_short", "message": "Provided text is too short or empty."})

    is_like, reason = _is_likely_resume(raw_text)
    if not is_like:
        raise ValueError(reason)

    sections = _split_into_sections(raw_text)
    sections_found = [k for k in sections if k != '_preamble' and sections[k].strip()]

    contact = _extract_contact(raw_text)
    cat_skills = _extract_skills_from_text(raw_text)
    all_skills = [s for skills in cat_skills.values() for s in skills]
    education = _extract_education(sections)
    experience, total_exp = _extract_experience(sections)

    return ParsedResume(
        raw_text=raw_text,
        contact=contact,
        categorized_skills=cat_skills,
        all_skills=all_skills,
        education=education,
        experience=experience,
        total_exp_years=total_exp,
        sections_found=sections_found,
    )


def _is_likely_resume(text: str):
    """
    Heuristic to detect whether the given text looks like a résumé.
    Combines contact presence, section headers, job-title tokens and skill density.
    Returns True if confidence is high enough.
    """
    if not text or len(text.strip()) < 200:
        return False, {"code": "too_short", "message": "Document text is too short; may be scanned or empty."}

    # Contact signals (require at least one)
    has_email = bool(_EMAIL_RE.search(text))
    has_phone = bool(_PHONE_RE.search(text))
    has_linkedin = bool(_LINKEDIN_RE.search(text))
    has_github = bool(_GITHUB_RE.search(text))

    contact_count = 0
    if has_email: contact_count += 1
    if has_phone: contact_count += 1
    if has_linkedin or has_github: contact_count += 1

    # Section headers
    has_section = False
    for key in ('skills', 'experience', 'education', 'projects'):
        if SECTION_PATTERNS.get(key) and SECTION_PATTERNS[key].search(text):
            has_section = True
            break

    # Job title tokens
    has_title_token = bool(_JOB_TITLE_RE.search(text))

    # Skill density: count distinct matched skills (lightweight, stop at 6)
    text_lower = text.lower()
    matched_skills = 0
    for skill_lower in _SKILL_LOWER_TO_CANONICAL.keys():
        if re.search(r'(?<![a-zA-Z0-9])' + re.escape(skill_lower) + r'(?![a-zA-Z0-9])', text_lower):
            matched_skills += 1
            if matched_skills >= 6:
                break

    # Decision logic:
    # - Require at least one contact signal
    if contact_count == 0:
        return False, {"code": "no_contact", "message": "No contact information (email/phone/linkedin/github) found."}

    # - Require at least one of: section header present OR >=3 matched skills OR job title token
    if has_section or matched_skills >= 3 or has_title_token:
        return True, None

    return False, {"code": "low_confidence", "message": "Document lacks clear resume sections or enough skill mentions."}


# ─────────────────────────────────────────────────────────────
# BACKWARDS-COMPATIBLE HELPERS  (used by existing endpoints)
# ─────────────────────────────────────────────────────────────
def extract_text_from_pdf_compat(file_path: str) -> str:
    return extract_text_from_pdf(file_path)

def extract_skills(text: str) -> List[str]:
    """Flat skill list for the existing /api/upload-resume endpoint."""
    cats = _extract_skills_from_text(text)
    return list({s for skills in cats.values() for s in skills})
