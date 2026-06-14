import apiClient from './apiClient';

const jobMarketService = {
  // Get job market data
  getJobMarketData: async (role, industry) => {
    try {
      const response = await apiClient.get('/job-market/data', {
        params: { role, industry }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch job market data' };
    }
  },

  // Get trending skills
  getTrendingSkills: async (role, industry) => {
    try {
      const response = await apiClient.get('/job-market/trending-skills', {
        params: { role, industry }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch trending skills' };
    }
  },

  // Get job market overview
  getJobMarketOverview: async (role, industry) => {
    try {
      const response = await apiClient.get('/job-market/overview', {
        params: { role, industry }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch job market overview' };
    }
  },

  // Search job market
  searchJobMarket: async (query, industry) => {
    try {
      const response = await apiClient.get('/job-market/search', {
        params: { q: query, industry }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Search failed' };
    }
  },

  // Sync job market data from external providers
  syncJobMarketData: async (payload = {}) => {
    try {
      const response = await apiClient.post('/job-market/sync', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to sync job market data' };
    }
  },

  // Get salary insights
  getSalaryInsights: async (role, industry) => {
    try {
      const response = await apiClient.get('/job-market/salary-insights', {
        params: { role, industry }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch salary insights' };
    }
  }
};

export default jobMarketService;
