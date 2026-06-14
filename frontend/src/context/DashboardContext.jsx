import React, { createContext, useState, useCallback, useEffect } from 'react';
import userService from '../services/userService';
import skillService from '../services/skillService';
import resumeService from '../services/resumeService';
import skillGapService from '../services/skillGapService';
import learningPathService from '../services/learningPathService';
import progressService from '../services/progressService';

export const DashboardContext = createContext();

const STORAGE_KEYS = {
  skillGap: 'gap2grow_skill_gap',
  currentResume: 'gap2grow_current_resume'
};

function readStoredJson(key, fallback = null) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

export const DashboardProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [currentResume, setCurrentResume] = useState(() => readStoredJson(STORAGE_KEYS.currentResume));
  const [skillGap, setSkillGap] = useState(() => readStoredJson(STORAGE_KEYS.skillGap));
  const [learningPaths, setLearningPaths] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [progress, setProgress] = useState(null);
  
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  // Set loading state
  const setItemLoading = useCallback((key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // Set error state
  const setItemError = useCallback((key, value) => {
    setError(prev => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (skillGap) {
      localStorage.setItem(STORAGE_KEYS.skillGap, JSON.stringify(skillGap));
    } else {
      localStorage.removeItem(STORAGE_KEYS.skillGap);
    }
  }, [skillGap]);

  useEffect(() => {
    if (currentResume) {
      localStorage.setItem(STORAGE_KEYS.currentResume, JSON.stringify(currentResume));
    } else {
      localStorage.removeItem(STORAGE_KEYS.currentResume);
    }
  }, [currentResume]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async (force = false) => {
    if (userProfile && !force) return userProfile;
    
    try {
      setItemLoading('userProfile', true);
      setItemError('userProfile', null);
      const data = await userService.getProfile();
      setUserProfile(data);
      return data;
    } catch (err) {
      const errorMsg = err.error || 'Failed to fetch profile';
      setItemError('userProfile', errorMsg);
      throw err;
    } finally {
      setItemLoading('userProfile', false);
    }
  }, [userProfile, setItemLoading, setItemError]);

  // Update user profile
  const updateUserProfile = useCallback(async (profileData) => {
    try {
      setItemLoading('userProfile', true);
      setItemError('userProfile', null);
      const response = await userService.updateProfile(profileData);
      setUserProfile(response.user);
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Failed to update profile';
      setItemError('userProfile', errorMsg);
      throw err;
    } finally {
      setItemLoading('userProfile', false);
    }
  }, [setItemLoading, setItemError]);

  // Fetch skills
  const fetchSkills = useCallback(async (force = false) => {
    if (skills.length > 0 && !force) return skills;
    
    try {
      setItemLoading('skills', true);
      setItemError('skills', null);
      const data = await skillService.getSkills();
      setSkills(data.skills || []);
      return data.skills;
    } catch (err) {
      const errorMsg = err.error || 'Failed to fetch skills';
      setItemError('skills', errorMsg);
      throw err;
    } finally {
      setItemLoading('skills', false);
    }
  }, [skills, setItemLoading, setItemError]);

  // Add skill
  const addSkill = useCallback(async (skillData) => {
    try {
      setItemLoading('skills', true);
      setItemError('skills', null);
      const response = await skillService.createSkill(skillData);
      setSkills(prev => [...prev, response.skill]);
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Failed to add skill';
      setItemError('skills', errorMsg);
      throw err;
    } finally {
      setItemLoading('skills', false);
    }
  }, [setItemLoading, setItemError]);

  // Update skill
  const updateSkill = useCallback(async (skillId, skillData) => {
    try {
      setItemLoading('skills', true);
      setItemError('skills', null);
      const response = await skillService.updateSkill(skillId, skillData);
      setSkills(prev => prev.map(s => s._id === skillId ? response.skill : s));
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Failed to update skill';
      setItemError('skills', errorMsg);
      throw err;
    } finally {
      setItemLoading('skills', false);
    }
  }, [setItemLoading, setItemError]);

  // Delete skill
  const deleteSkill = useCallback(async (skillId) => {
    try {
      setItemLoading('skills', true);
      setItemError('skills', null);
      await skillService.deleteSkill(skillId);
      setSkills(prev => prev.filter(s => s._id !== skillId));
      return { message: 'Skill deleted successfully' };
    } catch (err) {
      const errorMsg = err.error || 'Failed to delete skill';
      setItemError('skills', errorMsg);
      throw err;
    } finally {
      setItemLoading('skills', false);
    }
  }, [setItemLoading, setItemError]);

  // Fetch resumes
  const fetchResumes = useCallback(async (force = false) => {
    if (resumes.length > 0 && !force) return resumes;
    
    try {
      setItemLoading('resumes', true);
      setItemError('resumes', null);
      const data = await resumeService.getResumes();
      setResumes(data.resumes || []);
      return data.resumes;
    } catch (err) {
      const errorMsg = err.error || 'Failed to fetch resumes';
      setItemError('resumes', errorMsg);
      throw err;
    } finally {
      setItemLoading('resumes', false);
    }
  }, [resumes, setItemLoading, setItemError]);

  // Upload resume
  const uploadResume = useCallback(async (file) => {
    try {
      setItemLoading('resumes', true);
      setItemError('resumes', null);
      const response = await resumeService.uploadResume(file);
      setResumes(prev => [response.resume, ...prev]);
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Failed to upload resume';
      setItemError('resumes', errorMsg);
      throw err;
    } finally {
      setItemLoading('resumes', false);
    }
  }, [setItemLoading, setItemError]);

  // Fetch skill gap
  const fetchSkillGap = useCallback(async (force = false) => {
    if (skillGap && !force) return skillGap;
    
    try {
      setItemLoading('skillGap', true);
      setItemError('skillGap', null);
      const data = await skillGapService.getLatestSkillGap();
      console.log('[CONTEXT: fetchSkillGap] Successfully fetched data from API:', JSON.parse(JSON.stringify(data)));
      setSkillGap(data);
      return data;
    } catch (err) {
      console.error('[CONTEXT: fetchSkillGap] Failed to fetch:', err);
      const errorMsg = err.error || 'No skill gap analysis found';
      setItemError('skillGap', errorMsg);
      return null;
    } finally {
      setItemLoading('skillGap', false);
    }
  }, [skillGap, setItemLoading, setItemError]);

  // Create skill gap
  const createSkillGap = useCallback(async (analysisData) => {
    try {
      setItemLoading('skillGap', true);
      setItemError('skillGap', null);
      const response = await skillGapService.createSkillGap(analysisData);
      console.log('[CONTEXT: createSkillGap] Successfully created skill gap:', response.skillGap);
      setSkillGap(response.skillGap);
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Failed to create skill gap analysis';
      setItemError('skillGap', errorMsg);
      throw err;
    } finally {
      setItemLoading('skillGap', false);
    }
  }, [setItemLoading, setItemError]);

  // Fetch learning paths
  const fetchLearningPaths = useCallback(async (force = false) => {
    if (learningPaths.length > 0 && !force) return learningPaths;
    
    try {
      setItemLoading('learningPaths', true);
      setItemError('learningPaths', null);
      const data = await learningPathService.getLearningPaths();
      setLearningPaths(data.paths || []);
      return data.paths;
    } catch (err) {
      const errorMsg = err.error || 'Failed to fetch learning paths';
      setItemError('learningPaths', errorMsg);
      throw err;
    } finally {
      setItemLoading('learningPaths', false);
    }
  }, [learningPaths, setItemLoading, setItemError]);

  // Create learning path
  const createLearningPath = useCallback(async (pathData) => {
    try {
      setItemLoading('learningPaths', true);
      setItemError('learningPaths', null);
      const response = await learningPathService.createLearningPath(pathData);
      setLearningPaths(prev => [...prev, response.path]);
      setActivePath(response.path);
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Failed to create learning path';
      setItemError('learningPaths', errorMsg);
      throw err;
    } finally {
      setItemLoading('learningPaths', false);
    }
  }, [setItemLoading, setItemError]);

  // Update milestone
  const updateMilestone = useCallback(async (pathId, milestoneId, updateData) => {
    try {
      setItemLoading('learningPaths', true);
      setItemError('learningPaths', null);
      const response = await learningPathService.updateMilestone(pathId, milestoneId, updateData);
      setLearningPaths(prev => prev.map(p => p._id === pathId ? response.path : p));
      if (activePath?._id === pathId) {
        setActivePath(response.path);
      }
      return response;
    } catch (err) {
      const errorMsg = err.error || 'Failed to update milestone';
      setItemError('learningPaths', errorMsg);
      throw err;
    } finally {
      setItemLoading('learningPaths', false);
    }
  }, [activePath, setItemLoading, setItemError]);

  // Fetch progress
  const fetchProgress = useCallback(async (force = false) => {
    if (progress && !force) return progress;
    
    try {
      setItemLoading('progress', true);
      setItemError('progress', null);
      const data = await progressService.getProgress();
      setProgress(data);
      return data;
    } catch (err) {
      const errorMsg = err.error || 'Failed to fetch progress';
      setItemError('progress', errorMsg);
      throw err;
    } finally {
      setItemLoading('progress', false);
    }
  }, [progress, setItemLoading, setItemError]);

  const value = {
    // User Profile
    userProfile,
    fetchUserProfile,
    updateUserProfile,
    
    // Skills
    skills,
    fetchSkills,
    addSkill,
    updateSkill,
    deleteSkill,
    
    // Resumes
    resumes,
    currentResume,
    setCurrentResume,
    fetchResumes,
    uploadResume,
    
    // Skill Gap
    skillGap,
    fetchSkillGap,
    createSkillGap,
    
    // Learning Paths
    learningPaths,
    activePath,
    fetchLearningPaths,
    createLearningPath,
    updateMilestone,
    
    // Progress
    progress,
    fetchProgress,
    
    // State management
    loading,
    error,
    setItemLoading,
    setItemError
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom hook for using dashboard context
export const useDashboard = () => {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};
