const Resume = require('../models/Resume');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const textract = require('textract');

// Lightweight resume-detection heuristic ported from Python service
function _isLikelyResume(text) {
  if (!text || typeof text !== 'string' || text.trim().length < 200) return { ok: false, code: 'too_short', message: 'Document text is too short; may be scanned or empty.' };
  const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/i;
  const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{6,12}/;
  const LINKEDIN_RE = /linkedin\.com\/[A-Za-z0-9_\-\/]+/i;
  const GITHUB_RE = /github\.com\/[A-Za-z0-9_\-\/]+/i;
  const JOB_TITLE_RE = /\b(engineer|developer|manager|consultant|analyst|designer|scientist)\b/i;

  // contact signals
  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text);
  const hasLinkedin = LINKEDIN_RE.test(text);
  const hasGithub = GITHUB_RE.test(text);

  const contactCount = (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0) + ((hasLinkedin || hasGithub) ? 1 : 0);

  // section headers
  const SECTION_PATTERNS = [/^skills[:\s]?$/im, /experience[:\s]?$/im, /education[:\s]?$/im, /projects[:\s]?$/im, /summary[:\s]?$/im];
  let hasSection = false;
  for (const p of SECTION_PATTERNS) {
    if (p.test(text)) { hasSection = true; break; }
  }

  const skillCandidates = ['python','java','javascript','react','node','sql','aws','docker','kubernetes','git','html','css','tensorflow','pandas','c++','c#','ruby','php','go','typescript'];
  const textLower = text.toLowerCase();
  let matchedSkills = 0;
  for (const s of skillCandidates) {
    const re = new RegExp('\\b' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b','i');
    if (re.test(textLower)) {
      matchedSkills += 1;
      if (matchedSkills >= 6) break;
    }
  }

  const hasTitleToken = JOB_TITLE_RE.test(text);

  if (contactCount === 0) return { ok: false, code: 'no_contact', message: 'No contact information (email/phone/linkedin/github) found.' };
  if (hasSection || matchedSkills >= 3 || hasTitleToken) return { ok: true };
  return { ok: false, code: 'low_confidence', message: 'Document lacks clear resume sections or enough skill mentions.' };
}

// Get all resumes for user
exports.getUserResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.userId })
      .sort({ uploadedAt: -1 });

    res.status(200).json({
      count: resumes.length,
      resumes
    });
  } catch (err) {
    console.error('Get resumes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current resume
exports.getCurrentResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.userId, isCurrent: true });

    if (!resume) {
      return res.status(404).json({ error: 'No current resume found' });
    }

    res.status(200).json(resume);
  } catch (err) {
    console.error('Get current resume error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Upload resume
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file size (5MB)
    if (req.file.size > 5242880) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File size must be less than 5MB' });
    }

    // Extract text depending on file type (PDF, DOCX, DOC)
    const buffer = fs.readFileSync(req.file.path);
    let docText = '';
    try {
      if (req.file.mimetype === 'application/pdf' || path.extname(req.file.originalname).toLowerCase() === '.pdf') {
        const parsed = await pdfParse(buffer);
        docText = parsed.text || '';
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || path.extname(req.file.originalname).toLowerCase() === '.docx') {
        const mm = await mammoth.extractRawText({path: req.file.path});
        docText = mm && mm.value ? mm.value : '';
      } else if (req.file.mimetype === 'application/msword' || path.extname(req.file.originalname).toLowerCase() === '.doc') {
        // Use textract as a fallback for .doc files
        docText = await new Promise((resolve, reject) => {
          textract.fromFileWithPath(req.file.path, (err, text) => {
            if (err) return reject(err);
            resolve(text || '');
          });
        });
      } else {
        // Unsupported type
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Only PDF, DOC and DOCX files are supported.' });
      }
    } catch (parseErr) {
      console.error('Failed to extract text for validation:', parseErr);
      // If parsing fails, delete file and return error
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Unable to read document contents. Ensure the file is not image-only or corrupted.' });
    }

    // Run heuristic
    const result = _isLikelyResume(docText);
    if (!result.ok) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: result.message, code: result.code });
    }

    // Mark existing resume as not current
    await Resume.updateMany({ userId: req.user.userId }, { isCurrent: false });

    // Create new resume document
    const resume = new Resume({
      userId: req.user.userId,
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      processingStatus: 'Processing'
    });

    await resume.save();
    res.status(201).json({
      message: 'Resume uploaded successfully. Processing started.',
      resume,
      extracted_text: docText
    });
  } catch (err) {
    console.error('Upload resume error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update resume
exports.updateResume = async (req, res) => {
  try {
    const { extractedData, processingStatus, skillsExtracted, experienceLevel} = req.body;

    const resume = await Resume.findById(req.params.resumeId);

    if (!resume || resume.userId.toString() !== req.user.userId) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    if (extractedData) resume.extractedData = extractedData;
    if (processingStatus) resume.processingStatus = processingStatus;
    if (skillsExtracted) resume.skillsExtracted = skillsExtracted;
    if (experienceLevel) resume.experienceLevel = experienceLevel;
    resume.updatedAt = new Date();

    await resume.save();

    res.status(200).json({
      message: 'Resume updated successfully',
      resume
    });
  } catch (err) {
    console.error('Update resume error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete resume
exports.deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.resumeId);

    if (!resume || resume.userId.toString() !== req.user.userId) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Delete file
    const filePath = path.join(__dirname, '..', 'uploads', path.basename(resume.fileUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Resume.findByIdAndDelete(req.params.resumeId);

    res.status(200).json({ message: 'Resume deleted successfully' });
  } catch (err) {
    console.error('Delete resume error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
