import apiClient from './apiClient';

const PY_API = import.meta.env.VITE_PYTHON_BACKEND_URL;

const resumeService = {
  // Get all resumes
  getResumes: async () => {
    try {
      const response = await apiClient.get('/resumes');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch resumes' };
    }
  },

  // Get current resume
  getCurrentResume: async () => {
    try {
      const response = await apiClient.get('/resumes/current');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'No current resume found' };
    }
  },

  // Upload resume: validate with Python parser first, then save to Node
  uploadResume: async (file) => {
    try {
      const ext = (file.name || '').split('.').pop()?.toLowerCase();

      if (file.type === 'application/pdf' || ext === 'pdf') {
        // PDF flow: parse on Python, then upload to Node and attach
        const parseFd = new FormData();
        parseFd.append('file', file);
        const parseRes = await fetch(`${PY_API}/parse-resume`, { method: 'POST', body: parseFd });
        if (!parseRes.ok) {
          const err = await parseRes.json().catch(() => ({ detail: 'Invalid file' }));
          throw err;
        }
        const parsed = await parseRes.json();

        // Upload original file to Node backend
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/resumes/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const savedResume = response.data.resume;

        // Attach parsed data to saved resume
        try {
          await apiClient.put(`/resumes/${savedResume._id}`, {
            extractedData: parsed,
            processingStatus: 'Completed',
            skillsExtracted: parsed.all_skills,
            experienceLevel: parsed.total_exp_years
          });
        } catch (updateErr) {
          console.error('Failed to attach parsed data to saved resume:', updateErr);
        }

        return { ...response.data, parsed };
      } else {
        // DOC/DOCX flow: upload to Node (Node extracts text and validates), then send text to Python parse-text
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/resumes/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const savedResume = response.data.resume;
        const extractedText = response.data.extracted_text;

        // Parse extracted text on Python
        const parseRes = await fetch(`${PY_API}/parse-text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText, filename: file.name })
        });
        if (!parseRes.ok) {
          const err = await parseRes.json().catch(() => ({ detail: 'Text parsing failed' }));
          throw err;
        }
        const parsed = await parseRes.json();

        // Attach parsed data to saved resume
        try {
          await apiClient.put(`/resumes/${savedResume._id}`, {
            extractedData: parsed,
            processingStatus: 'Completed',
            skillsExtracted: parsed.all_skills,
            experienceLevel: parsed.total_exp_years
          });
        } catch (updateErr) {
          console.error('Failed to attach parsed data to saved resume:', updateErr);
        }

        return { ...response.data, parsed };
      }
    } catch (error) {
      throw error.response?.data || error || { error: 'Failed to upload resume' };
    }
  },

  // Update resume
  updateResume: async (resumeId, updateData) => {
    try {
      const response = await apiClient.put(`/resumes/${resumeId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update resume' };
    }
  },

  // Delete resume
  deleteResume: async (resumeId) => {
    try {
      const response = await apiClient.delete(`/resumes/${resumeId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to delete resume' };
    }
  }
};

export default resumeService;
