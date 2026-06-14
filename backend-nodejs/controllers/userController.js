const User = require('../models/User');
const SkillGap = require('../models/SkillGap');
const Resume = require('../models/Resume');
const JobMarket = require('../models/JobMarket');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('skills')
      .select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const {
      firstName, lastName, phone, bio, currentRole, targetRole,
      industry, yearsOfExperience, city, state, country, timezone,
      preferredLanguages, preferredLearningStyle, workAvailability,
      profileImage
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        firstName,
        lastName,
        phone,
        bio,
        currentRole,
        targetRole,
        industry,
        yearsOfExperience,
        city,
        state,
        country,
        timezone,
        preferredLanguages,
        preferredLearningStyle,
        workAvailability,
        profileImage,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Connect GitHub account by username and store public profile/repo stats
exports.connectGitHub = async (req, res) => {
  try {
    const { githubUsername } = req.body;

    if (!githubUsername || !githubUsername.trim()) {
      return res.status(400).json({ error: 'GitHub username is required' });
    }

    const username = githubUsername.trim().replace(/^@/, '');
    const profileResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'Gap2Grow' }
    });

    if (!profileResponse.ok) {
      return res.status(404).json({ error: 'GitHub user not found' });
    }

    const githubProfile = await profileResponse.json();

    const reposResponse = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
      { headers: { 'User-Agent': 'Gap2Grow' } }
    );

    if (!reposResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch GitHub repositories' });
    }

    const repos = await reposResponse.json();
    const languageCounts = repos.reduce((acc, repo) => {
      if (!repo.language) return acc;
      acc[repo.language] = (acc[repo.language] || 0) + 1;
      return acc;
    }, {});

    const githubTopLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        githubUsername: githubProfile.login,
        githubProfileUrl: githubProfile.html_url || `https://github.com/${githubProfile.login}`,
        githubAvatarUrl: githubProfile.avatar_url || '',
        githubBio: githubProfile.bio || '',
        githubRepoCount: githubProfile.public_repos ?? repos.length,
        githubTopLanguages,
        githubSyncedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'GitHub account connected successfully',
      user: updatedUser,
      github: {
        username: githubProfile.login,
        avatarUrl: githubProfile.avatar_url || '',
        profileUrl: githubProfile.html_url || `https://github.com/${githubProfile.login}`,
        bio: githubProfile.bio || '',
        repoCount: githubProfile.public_repos ?? repos.length,
        topLanguages: githubTopLanguages
      }
    });
  } catch (err) {
    console.error('GitHub connect error:', err);
    res.status(500).json({ error: 'Failed to connect GitHub account' });
  }
};

// Disconnect GitHub account and clear stored GitHub data
exports.disconnectGitHub = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        githubUsername: '',
        githubProfileUrl: '',
        githubAvatarUrl: '',
        githubBio: '',
        githubRepoCount: 0,
        githubTopLanguages: [],
        githubSyncedAt: null,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'GitHub account disconnected successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('GitHub disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect GitHub account' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.userId);
    
    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = await User.findById(req.user.userId);
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Delete user
    await User.findByIdAndDelete(req.user.userId);

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get personalized dashboard summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('User ID:', userId);

    const [user, analyses] = await Promise.all([
      User.findById(userId).select('firstName lastName profileImage githubUsername githubProfileUrl githubAvatarUrl githubBio githubRepoCount githubTopLanguages githubSyncedAt'),
      SkillGap.find({ userId })
        .select('targetRole matchPercentage analysisDate createdAt skillGap')
        .sort({ analysisDate: -1, createdAt: -1 })
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalAnalyses = analyses.length;
    const count = totalAnalyses;
    console.log('Resume Count:', count);
    const scores = analyses.map((a) => Number(a.matchPercentage || 0));
    const averageGapScore = scores.length
      ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1))
      : 0;

    const roleDistribution = analyses.reduce((acc, analysis) => {
      const role = analysis.targetRole || 'Unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const readinessSummary = { excellent: 0, promising: 0, building: 0 };
    scores.forEach((score) => {
      if (score >= 80) readinessSummary.excellent += 1;
      else if (score >= 50) readinessSummary.promising += 1;
      else readinessSummary.building += 1;
    });

    const missingSkillCounts = {};
    analyses.forEach((analysis) => {
      (analysis.skillGap || []).forEach((gapItem) => {
        if ((gapItem?.gap || 0) <= 0) return;
        const key = (gapItem.skillName || '').trim().toLowerCase();
        if (!key) return;
        missingSkillCounts[key] = (missingSkillCounts[key] || 0) + 1;
      });
    });

    const topMissingSkills = Object.entries(missingSkillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([skill, count]) => ({ skill, count }));

    const latestSkillGap = analyses[0] || null;
    const targetRole = latestSkillGap?.targetRole || user.currentRole || 'Developer';
    const targetIndustry = latestSkillGap?.targetIndustry || user.industry || '';

    const jobMarket = await JobMarket.findOne({
      role: { $regex: targetRole, $options: 'i' },
      ...(targetIndustry && { industry: { $regex: targetIndustry, $options: 'i' } })
    });

    const missingSkillNames = new Set(
      (latestSkillGap?.skillGap || [])
        .filter((gapItem) => (gapItem?.gap || 0) > 0)
        .map((gapItem) => (gapItem.skillName || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const trendingSkillLookup = new Map(
      (jobMarket?.trendingSkills || []).map((skill) => [
        (skill.skillName || '').trim().toLowerCase(),
        skill
      ])
    );

    const requiredSkillLookup = new Map(
      (jobMarket?.requiredSkills || []).map((skill) => [
        (skill.skillName || '').trim().toLowerCase(),
        skill
      ])
    );

    const recommendedSkillRows = [];
    missingSkillNames.forEach((skillName) => {
      const trendSkill = trendingSkillLookup.get(skillName);
      const requiredSkill = requiredSkillLookup.get(skillName);
      if (!trendSkill && !requiredSkill) return;

      const demandPercent = trendSkill?.demandGrowth ?? requiredSkill?.frequency ?? 0;
      const reason = trendSkill
        ? `${trendSkill.skillName} is trending with ${demandPercent}% demand growth.`
        : `${requiredSkill.skillName} is frequently requested in ${targetRole} roles.`;

      recommendedSkillRows.push({
        skillName: trendSkill?.skillName || requiredSkill?.skillName || skillName,
        demandPercent,
        reason,
        source: trendSkill ? 'trend' : 'requirement'
      });
    });

    (jobMarket?.trendingSkills || [])
      .filter((skill) => !missingSkillNames.has((skill.skillName || '').trim().toLowerCase()))
      .slice(0, 2)
      .forEach((skill) => {
        recommendedSkillRows.push({
          skillName: skill.skillName,
          demandPercent: skill.demandGrowth || 0,
          reason: `${skill.skillName} is growing in demand across ${jobMarket?.industry || targetIndustry || 'this market'}.`,
          source: 'market'
        });
      });

    const readyPercent = totalAnalyses > 0 ? Number(analyses[0].matchPercentage || 0) : 0;
    const improvementLift = recommendedSkillRows.length > 0
      ? Math.min(30, Math.max(8, Math.round(recommendedSkillRows.slice(0, 2).reduce((sum, skill) => sum + Math.max(6, Math.round(skill.demandPercent / 4)), 0))))
      : 0;

    const aiInsightMessage = recommendedSkillRows.length > 0
      ? `Your profile is ${readyPercent}% ready. Learning ${recommendedSkillRows.slice(0, 2).map((skill) => skill.skillName).join(' and ')} can increase your chances by ${improvementLift}%.`
      : `Your profile is ${readyPercent}% ready. Keep building momentum with the next recommended learning plan.`;

    const marketTrends = (jobMarket?.trendingSkills || [])
      .slice()
      .sort((a, b) => (b.demandGrowth || 0) - (a.demandGrowth || 0))
      .slice(0, 5)
      .map((skill) => {
        const matchedMissing = missingSkillNames.has((skill.skillName || '').trim().toLowerCase());
        return {
          skillName: skill.skillName,
          demandPercent: skill.demandGrowth || 0,
          trendScore: skill.trendScore || 0,
          isRecommended: matchedMissing,
          reason: matchedMissing
            ? `${skill.skillName} closes an identified gap and is rising in demand.`
            : `${skill.skillName} is trending in ${jobMarket?.industry || targetIndustry || 'the market'}.`
        };
      });

    const recentAnalyses = analyses.slice(0, 8).map((analysis) => {
      const analysisDate = analysis.analysisDate || analysis.createdAt;
      return {
        id: analysis._id,
        target_role: analysis.targetRole || 'Unknown Role',
        gap_score: Number(analysis.matchPercentage || 0),
        missing_count: (analysis.skillGap || []).filter((gapItem) => (gapItem?.gap || 0) > 0).length,
        created_at: analysisDate
      };
    });

    const progressOverTime = analyses
      .slice()
      .reverse()
      .slice(-6)
      .map((analysis) => {
        const analysisDate = analysis.analysisDate || analysis.createdAt;
        return {
          date: analysisDate,
          label: new Date(analysisDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          gap_score: Number(analysis.matchPercentage || 0)
        };
      });

    const lastAnalysisTime = analyses[0]?.analysisDate || analyses[0]?.createdAt || null;

    res.status(200).json({
      user,
      lastAnalysisTime,
      progressOverTime,
      overview: {
        total_analyses: totalAnalyses,
        total_resumes: count,
        average_gap_score: averageGapScore,
        latest_gap_score: totalAnalyses > 0 ? Number(analyses[0].matchPercentage || 0) : 0,
        role_distribution: roleDistribution,
        top_missing_skills: topMissingSkills,
        readiness_summary: readinessSummary
      },
      aiInsight: {
        message: aiInsightMessage,
        readyPercent,
        upliftPercent: improvementLift,
        recommendedSkills: recommendedSkillRows.slice(0, 3),
        updatedAt: new Date().toISOString()
      },
      marketTrends,
      recentAnalyses
    });
  } catch (err) {
    console.error('Get dashboard summary error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
