import React, { createContext, useContext, ReactNode } from 'react';
import { CategoryTheme, categoryThemes, EventCategory } from '../../../shared/theme/categoryThemes';

interface CategoryThemeContextType {
  theme: CategoryTheme;
  category: EventCategory | 'default';
}

const defaultThemeContext: CategoryThemeContextType = {
  theme: categoryThemes.other,
  category: 'default',
};

const CategoryThemeContext = createContext<CategoryThemeContextType>(defaultThemeContext);

export const useCategoryTheme = () => useContext(CategoryThemeContext);

interface CategoryThemeProviderProps {
  category?: EventCategory | string;
  children: ReactNode;
}

export const CategoryThemeProvider: React.FC<CategoryThemeProviderProps> = ({ 
  category, 
  children 
}) => {
  // Fallback to 'other' theme if category is unknown or default
  const validCategory = (category && category in categoryThemes) 
    ? (category as EventCategory) 
    : 'other';
    
  const theme = categoryThemes[validCategory];

  return (
    <CategoryThemeContext.Provider value={{ theme, category: validCategory }}>
      {children}
    </CategoryThemeContext.Provider>
  );
};
