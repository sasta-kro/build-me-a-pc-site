import { createContext, useContext, useCallback } from 'react';
import api from '../api/axios.js';

const DataContext = createContext(null);

const ENDPOINTS = {
  parts: '/parts',
  builds: '/builds',
  build_requests: '/requests',
  builder_offers: '/offers',
  showcase_inquiries: '/inquiries',
  builder_apps: '/applications',
  part_categories: '/categories',
  users: '/users',
};

export function DataProvider({ children }) {
  // ─── Generic CRUD ─────────────────────────────────────────
  const getAll = useCallback(async (collection) => {
    const endpoint = ENDPOINTS[collection];
    if (!endpoint) throw new Error(`Unknown collection: ${collection}`);
    const { data } = await api.get(endpoint);
    return data;
  }, []);

  const getItemById = useCallback(async (collection, id) => {
    const endpoint = ENDPOINTS[collection];
    if (!endpoint) throw new Error(`Unknown collection: ${collection}`);
    const { data } = await api.get(`${endpoint}/${id}`);
    return data;
  }, []);

  const createItem = useCallback(async (collection, itemData) => {
    const endpoint = ENDPOINTS[collection];
    if (!endpoint) throw new Error(`Unknown collection: ${collection}`);
    const { data } = await api.post(endpoint, itemData);
    return data;
  }, []);

  const editItem = useCallback(async (collection, id, updates) => {
    const endpoint = ENDPOINTS[collection];
    if (!endpoint) throw new Error(`Unknown collection: ${collection}`);
    const { data } = await api.put(`${endpoint}/${id}`, updates);
    return data;
  }, []);

  const removeItem = useCallback(async (collection, id) => {
    const endpoint = ENDPOINTS[collection];
    if (!endpoint) throw new Error(`Unknown collection: ${collection}`);
    await api.delete(`${endpoint}/${id}`);
  }, []);

  // ─── Part Categories ──────────────────────────────────────
  const getCategories = useCallback(async () => {
    const { data } = await api.get('/categories');
    return data;
  }, []);

  // ─── Parts ────────────────────────────────────────────────
  const getParts = useCallback(async (categoryId) => {
    const params = {};
    if (categoryId) params.category_id = categoryId;
    const { data } = await api.get('/parts', { params });
    return data;
  }, []);

  const getAllParts = useCallback(async () => {
    const { data } = await api.get('/parts/all');
    return data;
  }, []);

  // ─── Builds ───────────────────────────────────────────────
  const getBuilds = useCallback(async (filters = {}) => {
    const { data } = await api.get('/builds', { params: filters });
    return data;
  }, []);

  const getBuildParts = useCallback(async (buildId) => {
    const { data } = await api.get(`/builds/${buildId}/parts`);
    return data;
  }, []);

  const saveBuild = useCallback(async (buildData, selectedParts) => {
    const payload = { ...buildData, parts: selectedParts };
    if (buildData.id) {
      const { data } = await api.put(`/builds/${buildData.id}`, payload);
      return data.build;
    } else {
      const { data } = await api.post('/builds', payload);
      return data.build;
    }
  }, []);

  const updateBuild = useCallback(async (buildId, updates) => {
    const { data } = await api.put(`/builds/${buildId}`, updates);
    return data.build || data;
  }, []);

  // ─── Build Requests ───────────────────────────────────────
  const getRequests = useCallback(async (filters = {}) => {
    const { data } = await api.get('/requests', { params: filters });
    return data;
  }, []);

  // ─── Builder Offers ───────────────────────────────────────
  const getOffers = useCallback(async (filters = {}) => {
    const { data } = await api.get('/offers', { params: filters });
    return data;
  }, []);

  const acceptOffer = useCallback(async (offerId) => {
    const { data } = await api.post(`/offers/${offerId}/accept`);
    return data;
  }, []);

  // ─── Ratings ──────────────────────────────────────────────
  const getRatings = useCallback(async (buildId) => {
    const { data } = await api.get(`/builds/${buildId}/ratings`);
    return data;
  }, []);

  const getUserRating = useCallback(async (buildId) => {
    try {
      const { data } = await api.get(`/builds/${buildId}/ratings/mine`);
      return data;
    } catch (err) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }, []);

  const addRating = useCallback(async (buildId, ratingData) => {
    const payload = {
      ...ratingData,
      review_text: ratingData?.review ?? ratingData?.review_text ?? null,
    };
    delete payload.review;
    const { data } = await api.post(`/builds/${buildId}/ratings`, payload);
    return data;
  }, []);

  // ─── Comments ─────────────────────────────────────────────
  const getComments = useCallback(async (buildId) => {
    const { data } = await api.get(`/builds/${buildId}/comments`);
    return data;
  }, []);

  const addComment = useCallback(async (buildId, commentData) => {
    const payload = {
      ...commentData,
      parent_comment_id: commentData?.parent_id ?? commentData?.parent_comment_id ?? null,
    };
    delete payload.parent_id;
    const { data } = await api.post(`/builds/${buildId}/comments`, payload);
    return data;
  }, []);

  // ─── Likes ────────────────────────────────────────────────
  const getLikes = useCallback(async (buildId) => {
    const { data } = await api.get(`/builds/${buildId}/likes`);
    return data;
  }, []);

  const isLiked = useCallback(async (buildId) => {
    try {
      const { data } = await api.get(`/builds/${buildId}/likes/check`);
      return data.liked;
    } catch {
      return false;
    }
  }, []);

  const toggleLike = useCallback(async (buildId) => {
    const { data } = await api.post(`/builds/${buildId}/likes/toggle`);
    return data.liked;
  }, []);

  // ─── Users ────────────────────────────────────────────────
  const getUser = useCallback(async (id) => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  }, []);

  const getUsers = useCallback(async () => {
    const { data } = await api.get('/users');
    return data;
  }, []);

  const updateUser = useCallback(async (userId, updates) => {
    const { data } = await api.put(`/users/${userId}`, updates);
    return data;
  }, []);

  const banUser = useCallback(async (userId, isBanned) => {
    const { data } = await api.put(`/users/${userId}/ban`, { is_banned: isBanned });
    return data;
  }, []);

  const changeUserRole = useCallback(async (userId, role) => {
    const { data } = await api.put(`/users/${userId}/role`, { role });
    return data;
  }, []);

  const getBuilders = useCallback(async () => {
    const { data } = await api.get('/users/builders');
    return data;
  }, []);

  // ─── Builder Profiles ─────────────────────────────────────
  const getBuilderProfile = useCallback(async (userId) => {
    try {
      const { data } = await api.get(`/users/${userId}/builder-profile`);
      return data;
    } catch (err) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }, []);

  const updateBuilderProfile = useCallback(async (userId, updates) => {
    const { data } = await api.put(`/users/${userId}/builder-profile`, updates);
    return data;
  }, []);

  // ─── Showcase Inquiries ───────────────────────────────────
  const getInquiries = useCallback(async (filters = {}) => {
    const { data } = await api.get('/inquiries', { params: filters });
    return data;
  }, []);

  const createInquiry = useCallback(async (inquiryData) => {
    const { data } = await api.post('/inquiries', inquiryData);
    return data;
  }, []);

  // ─── Builder Applications ─────────────────────────────────
  const getApplications = useCallback(async (filters = {}) => {
    const { data } = await api.get('/applications', { params: filters });
    return data;
  }, []);

  const getMyApplications = useCallback(async () => {
    const { data } = await api.get('/applications/mine');
    return data;
  }, []);

  const reviewApplication = useCallback(async (appId, status, adminNotes) => {
    const { data } = await api.put(`/applications/${appId}/review`, { status, admin_notes: adminNotes });
    return data;
  }, []);

  // ─── Compatibility ────────────────────────────────────────
  const checkCompatibility = useCallback(async (partsMap) => {
    if (!partsMap || typeof partsMap !== 'object') return [];

    const normalized = {};
    Object.entries(partsMap).forEach(([slug, value]) => {
      if (!value) return;
      if (typeof value === 'string') {
        normalized[slug] = value;
        return;
      }
      if (typeof value === 'object' && value.id) {
        normalized[slug] = value.id;
      }
    });

    if (Object.keys(normalized).length === 0) return [];

    const { data } = await api.post('/compatibility/check', { parts: normalized });
    return data.issues;
  }, []);

  const getCompatibilityRules = useCallback(async () => {
    const { data } = await api.get('/compatibility/rules');
    return data;
  }, []);

  const createCompatibilityRule = useCallback(async (ruleData) => {
    const { data } = await api.post('/compatibility/rules', ruleData);
    return data;
  }, []);

  const updateCompatibilityRule = useCallback(async (ruleId, updates) => {
    const { data } = await api.put(`/compatibility/rules/${ruleId}`, updates);
    return data;
  }, []);

  const deleteCompatibilityRule = useCallback(async (ruleId) => {
    const { data } = await api.delete(`/compatibility/rules/${ruleId}`);
    return data;
  }, []);

  // ─── Stats (public) ───────────────────────────────────────
  const getStats = useCallback(async () => {
    const { data } = await api.get('/stats');
    return data;
  }, []);

  const value = {
    // Generic
    getAll, getItemById, createItem, editItem, removeItem,
    // Categories & Parts
    getCategories, getParts, getAllParts,
    // Builds
    getBuilds, getBuildParts, saveBuild, updateBuild,
    // Requests & Offers
    getRequests, getOffers, acceptOffer,
    // Social
    getRatings, getUserRating, addRating,
    getComments, addComment,
    getLikes, isLiked, toggleLike,
    // Users & Builders
    getUser, getUsers, updateUser, banUser, changeUserRole, getBuilders,
    getBuilderProfile, updateBuilderProfile,
    // Inquiries & Applications
    getInquiries, createInquiry, getApplications, getMyApplications, reviewApplication,
    // Compatibility
    checkCompatibility,
    getCompatibilityRules,
    createCompatibilityRule,
    updateCompatibilityRule,
    deleteCompatibilityRule,
    // Stats
    getStats,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
