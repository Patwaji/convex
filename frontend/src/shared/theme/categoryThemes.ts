import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

export type EventCategory = 'tech' | 'corporate' | 'social' | 'sports' | 'arts' | 'education' | 'health' | 'other';

export type CategoryTheme = {
  name: string;
  background: string;
  surface: string;
  accent: string;
  accentText: string;
  textPrimary: string;
  textSecondary: string;
  borderRadius: number;
  cardElevation: number;
  fontFamily: {
    title: string;
    body: string;
    mono: string;
  };
  glow: {
    color: string;
    opacity: number;
    blur: number;
  };
  border: {
    width: number;
    color: string;
    style: 'solid' | 'dashed';
  };
  shadow: {
    color: string;
    opacity: number;
    offset: { x: number; y: number };
    radius: number;
  };
  iconSet: string;
};

export const categoryThemes: Record<EventCategory, CategoryTheme> = {
  tech: {
    name: 'Tech',
    background: '#000000',
    surface: '#0A0A0A',
    accent: '#00F0FF',
    accentText: '#000000',
    textPrimary: '#FFFFFF',
    textSecondary: '#666666',
    borderRadius: 0,
    cardElevation: 0,
    fontFamily: {
      title: 'System',
      body: 'System',
      mono: 'System',
    },
    glow: {
      color: '#00F0FF',
      opacity: 0.8,
      blur: 15,
    },
    border: {
      width: 1,
      color: '#00F0FF33',
      style: 'solid',
    },
    shadow: {
      color: '#00F0FF',
      opacity: 0.5,
      offset: { x: 0, y: 0 },
      radius: 10,
    },
    iconSet: 'Feather',
  },
  corporate: {
    name: 'Corporate',
    background: '#FAFBFC',
    surface: '#FFFFFF',
    accent: '#2563EB',
    accentText: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    borderRadius: 6,
    cardElevation: 2,
    fontFamily: {
      title: 'System',
      body: 'System',
      mono: 'System',
    },
    glow: {
      color: '#2563EB',
      opacity: 0.2,
      blur: 8,
    },
    border: {
      width: 1,
      color: '#E5E7EB',
      style: 'solid',
    },
    shadow: {
      color: '#000000',
      opacity: 0.06,
      offset: { x: 0, y: 2 },
      radius: 6,
    },
    iconSet: 'Feather',
  },
  social: {
    name: 'Social',
    background: '#1A1A2E',
    surface: '#2D2D44',
    accent: '#FF6B6B',
    accentText: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0B0',
    borderRadius: 24,
    cardElevation: 4,
    fontFamily: {
      title: 'System',
      body: 'System',
      mono: 'System',
    },
    glow: {
      color: '#FF6B6B',
      opacity: 0.4,
      blur: 15,
    },
    border: {
      width: 1,
      color: '#FF6B6B33',
      style: 'solid',
    },
    shadow: {
      color: '#FF6B6B',
      opacity: 0.2,
      offset: { x: 0, y: 6 },
      radius: 16,
    },
    iconSet: 'Feather',
  },
  sports: {
    name: 'Sports',
    background: '#0A0A0A',
    surface: '#1A1A1A',
    accent: '#FFD700',
    accentText: '#000000',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    borderRadius: 0,
    cardElevation: 0,
    fontFamily: {
      title: 'System',
      body: 'System',
      mono: 'System',
    },
    glow: {
      color: '#FFD700',
      opacity: 0.5,
      blur: 10,
    },
    border: {
      width: 2,
      color: '#FFD700',
      style: 'solid',
    },
    shadow: {
      color: '#FFD700',
      opacity: 0.4,
      offset: { x: 4, y: 4 },
      radius: 0,
    },
    iconSet: 'Feather',
  },
  arts: {
    name: 'Arts',
    background: '#0D0D0D',
    surface: '#141414',
    accent: '#D4AF37',
    accentText: '#1C1410',
    textPrimary: '#FAF5F0',
    textSecondary: '#A89580',
    borderRadius: 2,
    cardElevation: 0,
    fontFamily: {
      title: 'System',
      body: 'System',
      mono: 'System',
    },
    glow: {
      color: '#D4AF37',
      opacity: 0.3,
      blur: 8,
    },
    border: {
      width: 1,
      color: '#D4AF3744',
      style: 'solid',
    },
    shadow: {
      color: '#D4AF37',
      opacity: 0.2,
      offset: { x: 2, y: 4 },
      radius: 8,
    },
    iconSet: 'Feather',
  },
  education: {
    name: 'Education',
    background: '#1A2744',
    surface: '#243B61',
    accent: '#3B82F6',
    accentText: '#FFFFFF',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    borderRadius: 12,
    cardElevation: 2,
    fontFamily: {
      title: 'System',
      body: 'System',
      mono: 'System',
    },
    glow: {
      color: '#3B82F6',
      opacity: 0.2,
      blur: 0,
    },
    border: {
      width: 1,
      color: '#3B82F633',
      style: 'solid',
    },
    shadow: {
      color: '#3B82F6',
      opacity: 0.1,
      offset: { x: 0, y: 4 },
      radius: 12,
    },
    iconSet: 'Feather',
  },
  health: {
    name: 'Health',
    background: '#E8F5F0',
    surface: '#FFFFFF',
    accent: '#10B981',
    accentText: '#FFFFFF',
    textPrimary: '#064E3B',
    textSecondary: '#6B7280',
    borderRadius: 20,
    cardElevation: 3,
    fontFamily: {
      title: 'System',
      body: 'System',
      mono: 'System',
    },
    glow: {
      color: '#10B981',
      opacity: 0.3,
      blur: 12,
    },
    border: {
      width: 0,
      color: '#10B98133',
      style: 'solid',
    },
    shadow: {
      color: '#10B981',
      opacity: 0.15,
      offset: { x: 0, y: 4 },
      radius: 12,
    },
    iconSet: 'Feather',
  },
  other: {
    name: 'Other',
    background: '#F3F4F6',
    surface: '#FFFFFF',
    accent: '#8B5CF6',
    accentText: '#FFFFFF',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    borderRadius: 12,
    cardElevation: 2,
    fontFamily: {
      title: 'System',
      body: 'System',
      mono: 'System',
    },
    glow: {
      color: '#8B5CF6',
      opacity: 0.2,
      blur: 0,
    },
    border: {
      width: 1,
      color: '#E5E7EB',
      style: 'solid',
    },
    shadow: {
      color: '#000000',
      opacity: 0.08,
      offset: { x: 0, y: 2 },
      radius: 8,
    },
    iconSet: 'Feather',
  },
};

export const getTechStyles = () => StyleSheet.create({
  container: { backgroundColor: '#000000' },
  header: { backgroundColor: 'transparent', borderBottomWidth: 2, borderBottomColor: '#00F0FF33' },
  title: { color: '#00F0FF', fontSize: 32, fontWeight: '900', letterSpacing: 0, textShadowColor: '#00F0FF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  pill: { borderWidth: 1, borderColor: '#00F0FF44', backgroundColor: '#0A0A0A' },
  pillSelected: { backgroundColor: '#00F0FF', borderColor: '#00F0FF' },
  card: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#00F0FF33', borderRadius: 0 },
  badge: { backgroundColor: '#00F0FF', borderRadius: 0, borderWidth: 0, paddingHorizontal: 6, paddingVertical: 2 },
  createButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#00F0FF', borderRadius: 0 },
  createButtonText: { color: '#00F0FF', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', fontSize: 11 },
  skeletonCard: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#00F0FF22' },
  iconGlow: { shadowColor: '#00F0FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12 },
});

export const getCorporateStyles = () => StyleSheet.create({
  container: { backgroundColor: '#FAFBFC' },
  header: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  title: { color: '#111827', fontSize: 32, fontWeight: '200', letterSpacing: 3, textTransform: 'uppercase' },
  pill: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  pillSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6 },
  badge: { backgroundColor: '#2563EB', borderRadius: 4 },
  createButton: { backgroundColor: '#2563EB', borderWidth: 0, borderRadius: 6 },
  createButtonText: { color: '#FFFFFF', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 },
  skeletonCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  iconGlow: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
});

export const getSocialStyles = () => StyleSheet.create({
  container: { backgroundColor: '#1A1A2E' },
  header: { backgroundColor: 'transparent' },
  title: { color: '#FFD93D', fontSize: 32, fontWeight: '900', letterSpacing: 1, textShadowColor: '#FF6B6B', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  pill: { backgroundColor: '#2D2D44', borderWidth: 0 },
  pillSelected: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  card: { backgroundColor: '#2D2D44', borderRadius: 20, borderWidth: 1, borderColor: '#FF6B6B33' },
  badge: { backgroundColor: '#FF6B6B', borderRadius: 8 },
  createButton: { backgroundColor: '#FF6B6B', borderRadius: 24, borderWidth: 2, borderColor: '#FFD93D' },
  createButtonText: { color: '#FFFFFF', fontWeight: '800', letterSpacing: 1 },
  skeletonCard: { backgroundColor: '#2D2D44', borderRadius: 20 },
  iconGlow: { shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 },
});

export const getSportsStyles = () => StyleSheet.create({
  container: { backgroundColor: '#0A0A0A' },
  header: { backgroundColor: 'transparent' },
  title: { color: '#FFD700', fontSize: 32, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, textShadowColor: '#FFD700', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  pill: { backgroundColor: '#1A1A1A', borderWidth: 2, borderColor: '#FFD70055' },
  pillSelected: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  card: { backgroundColor: '#141414', borderWidth: 2, borderColor: '#FFD700', borderRadius: 0 },
  badge: { backgroundColor: '#FFD700', borderRadius: 0, borderWidth: 2, borderColor: '#FFFFFF' },
  createButton: { backgroundColor: '#FFD700', borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 0, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 8 },
  createButtonText: { color: '#000000', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  skeletonCard: { backgroundColor: '#141414', borderWidth: 2, borderColor: '#FFD70044' },
  iconGlow: { shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12 },
});

export const getArtsStyles = () => StyleSheet.create({
  container: { backgroundColor: '#0D0D0D' },
  header: { backgroundColor: 'transparent' },
  title: { color: '#D4AF37', fontSize: 32, fontWeight: '300', letterSpacing: 4, fontStyle: 'italic' },
  pill: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#D4AF3744' },
  pillSelected: { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
  card: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#D4AF3744', borderRadius: 2 },
  badge: { backgroundColor: '#D4AF37', borderRadius: 1, borderWidth: 1, borderColor: '#FFFFFF' },
  createButton: { backgroundColor: '#D4AF37', borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 2, shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8 },
  createButtonText: { color: '#0D0D0D', fontWeight: '300', fontStyle: 'italic', letterSpacing: 2 },
  skeletonCard: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#D4AF3744' },
  iconGlow: { shadowColor: '#D4AF37', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6 },
});

export const getEducationStyles = () => StyleSheet.create({
  container: { backgroundColor: '#1A2744' },
  header: { backgroundColor: 'transparent' },
  title: { color: '#F8FAFC', fontSize: 32, fontWeight: '200', letterSpacing: 2 },
  pill: { backgroundColor: '#243B61', borderWidth: 1, borderColor: '#3B82F633' },
  pillSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  card: { backgroundColor: '#243B61', borderRadius: 8, borderWidth: 1, borderColor: '#3B82F633' },
  badge: { backgroundColor: '#3B82F6', borderRadius: 4 },
  createButton: { backgroundColor: '#3B82F6', borderRadius: 20 },
  createButtonText: { color: '#FFFFFF', fontWeight: '500', letterSpacing: 1 },
  skeletonCard: { backgroundColor: '#243B61' },
  iconGlow: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 6 },
});

export const getHealthStyles = () => StyleSheet.create({
  container: { backgroundColor: '#E8F5F0' },
  header: { backgroundColor: 'transparent' },
  title: { color: '#1B4D3E', fontSize: 32, fontWeight: '600', letterSpacing: 0 },
  pill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#1B4D3E22' },
  pillSelected: { backgroundColor: '#1B4D3E' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#1B4D3E11' },
  badge: { backgroundColor: '#1B4D3E', borderRadius: 8 },
  createButton: { backgroundColor: '#1B4D3E', borderRadius: 24 },
  createButtonText: { color: '#FFFFFF', fontWeight: '500' },
  skeletonCard: { backgroundColor: '#FFFFFF' },
  iconGlow: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6 },
});

export const getOtherStyles = () => StyleSheet.create({
  container: { backgroundColor: '#F3F4F6' },
  header: { backgroundColor: 'transparent' },
  title: { color: '#1F2937', fontSize: 32, fontWeight: '700', letterSpacing: 0 },
  pill: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  pillSelected: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  badge: { backgroundColor: '#8B5CF6', borderRadius: 6 },
  createButton: { backgroundColor: '#8B5CF6', borderRadius: 12 },
  createButtonText: { color: '#FFFFFF', fontWeight: '600', letterSpacing: 0.5 },
  skeletonCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  iconGlow: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
});

export const getStylesForCategory = (category: EventCategory): ReturnType<typeof StyleSheet.create> => {
  switch (category) {
    case 'tech': return getTechStyles();
    case 'corporate': return getCorporateStyles();
    case 'social': return getSocialStyles();
    case 'sports': return getSportsStyles();
    case 'arts': return getArtsStyles();
    case 'education': return getEducationStyles();
    case 'health': return getHealthStyles();
    case 'other': return getOtherStyles();
    default: return getOtherStyles();
  }
};