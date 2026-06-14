def is_likely_resume(text: str) -> bool:
    import re

    if not text or len(text.strip()) < 200:
        return False

    score = 0

    # regexes
    EMAIL_RE   = re.compile(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}')
    PHONE_RE   = re.compile(r'(?:\+?\d[\d\s\-().]{7,}\d)')
    LINKEDIN_RE = re.compile(r'(?:linkedin\.com/in/|linkedin:?\s*)\S+', re.I)
    GITHUB_RE   = re.compile(r'(?:github\.com/|github:?\s*)\S+', re.I)

    # contact
    if EMAIL_RE.search(text):
        score += 2
    if PHONE_RE.search(text):
        score += 1
    if LINKEDIN_RE.search(text) or GITHUB_RE.search(text):
        score += 1

    # section headers
    for pat in ['skills', 'experience', 'education', 'projects']:
        if re.search(r'\b' + pat + r'\b', text, re.I):
            score += 2

    # job title tokens
    job_keywords = ['engineer', 'developer', 'manager', 'analyst', 'scientist', 'architect']
    if any(re.search(r'\b' + kw + r'\b', text, re.I) for kw in job_keywords):
        score += 1

    # simple skill list check (subset)
    skill_list = ['python','javascript','react','docker','sql','aws','tensorflow','pandas']
    matched_skills = 0
    text_lower = text.lower()
    for s in skill_list:
        if re.search(r'(?<![a-zA-Z0-9])' + re.escape(s) + r'(?![a-zA-Z0-9])', text_lower):
            matched_skills += 1
            if matched_skills >= 6:
                break

    if matched_skills >= 6:
        score += 3
    elif matched_skills >= 3:
        score += 1

    return score >= 5


resume_like = '''
John Doe
Email: john.doe@example.com | Phone: +1 555-123-4567 | linkedin.com/in/johndoe

Summary
Experienced Software Engineer with 5+ years building web applications.

Skills
Python, JavaScript, React, Docker, SQL, AWS, Node.js, Git

Experience
Senior Software Engineer at Acme Corp (2019 - Present)
Built REST APIs, led CI/CD, dockerized services.

Education
B.Sc. Computer Science, University of Somewhere (2014 - 2018)
'''

non_resume = '''
Introduction
This paper explores kernel methods in non-linear regression. The dataset consists of 10,000 samples collected from sensors.

Abstract
We propose a new method for time-series forecasting using wavelet transforms and compare to baselines.

Methodology
We describe the mathematical derivation and provide extensive experimental results.

References
[1] Some academic reference.
'''

print('Resume-like detected?', is_likely_resume(resume_like))
print('Non-resume detected?', is_likely_resume(non_resume))
