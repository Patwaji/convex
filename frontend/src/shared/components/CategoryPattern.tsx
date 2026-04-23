import React from 'react';
import { View, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type Category =
  | 'tech'
  | 'corporate'
  | 'social'
  | 'sports'
  | 'arts'
  | 'education'
  | 'health'
  | 'other';

interface PatternProps {
  category: Category;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
}

const TechPattern = ({ width, height, color, opacity }: Omit<PatternProps, 'category'>) => {
  const step = 32;
  const items: React.ReactNode[] = [];
  const cols = Math.ceil(width / step) + 1;
  const rows = Math.ceil(height / step) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * step;
      const y = row * step;
      const isEven = (row + col) % 2 === 0;

      items.push(
        <View key={`th-${row}-${col}`} style={{
          position: 'absolute', left: x, top: y,
          width: step * 0.65, height: 1.5, backgroundColor: color, opacity,
        }} />,
        <View key={`tv-${row}-${col}`} style={{
          position: 'absolute',
          left: isEven ? x + step * 0.65 : x,
          top: y,
          width: 1.5, height: step * 0.65,
          backgroundColor: color, opacity,
        }} />,
        <View key={`td-${row}-${col}`} style={{
          position: 'absolute', left: x - 3, top: y - 3,
          width: 6, height: 6, borderRadius: 1,
          backgroundColor: color, opacity: Math.min(1, (opacity ?? 0.15) * 1.8),
        }} />,
      );
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
      {items}
    </View>
  );
};

const CorporatePattern = ({ width, height, color, opacity }: Omit<PatternProps, 'category'>) => {
  const r = 22;
  const hexW = r * 1.732;
  const hexH = r * 2;
  const items: React.ReactNode[] = [];
  const cols = Math.ceil(width / hexW) + 2;
  const rows = Math.ceil(height / (hexH * 0.75)) + 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * hexW + (row % 2 === 0 ? 0 : hexW / 2) - hexW;
      const cy = row * hexH * 0.75 - hexH;

      items.push(
        <View key={`hex-${row}-${col}`} style={{
          position: 'absolute',
          left: cx, top: cy,
          width: r * 1.6, height: r * 1.6,
          borderWidth: 1.5, borderColor: color,
          borderRadius: r * 0.46,
          opacity,
          transform: [{ rotate: '30deg' }],
        }} />,
      );
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
      {items}
    </View>
  );
};

const SocialPattern = ({ width, height, color, opacity }: Omit<PatternProps, 'category'>) => {
  const cell = 58;
  const items: React.ReactNode[] = [];
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * cell + (row % 2 === 0 ? 0 : cell / 2) - cell;
      const cy = row * cell - cell;

      [10, 22, 34].forEach((r, i) => {
        items.push(
          <View key={`ring-${row}-${col}-${i}`} style={{
            position: 'absolute',
            left: cx - r, top: cy - r,
            width: r * 2, height: r * 2,
            borderRadius: r,
            borderWidth: 1.2, borderColor: color,
            opacity: (opacity ?? 0.12) * (1 - i * 0.25),
          }} />,
        );
      });
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
      {items}
    </View>
  );
};

const SportsPattern = ({ width, height, color, opacity }: Omit<PatternProps, 'category'>) => {
  const chevSpacing = 22;
  const chevWidth = 38;
  const items: React.ReactNode[] = [];
  const rowCount = Math.ceil(height / chevSpacing) + 2;
  const colCount = Math.ceil(width / chevWidth) + 2;

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const x = col * chevWidth - chevWidth;
      const y = row * chevSpacing - chevSpacing;

      items.push(
        <View key={`chl-${row}-${col}`} style={{
          position: 'absolute',
          left: x, top: y,
          width: chevWidth * 0.55, height: 2,
          backgroundColor: color, opacity,
          transform: [{ rotate: '-28deg' }],
        }} />,
        <View key={`chr-${row}-${col}`} style={{
          position: 'absolute',
          left: x + chevWidth * 0.45, top: y,
          width: chevWidth * 0.55, height: 2,
          backgroundColor: color, opacity,
          transform: [{ rotate: '28deg' }],
        }} />,
      );
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
      {items}
    </View>
  );
};

const ArtsPattern = ({ width, height, color, opacity }: Omit<PatternProps, 'category'>) => {
  const size = 34;
  const half = size / 2;
  const items: React.ReactNode[] = [];
  const cols = Math.ceil(width / size) + 2;
  const rows = Math.ceil(height / size) + 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * size + (row % 2 === 0 ? 0 : half) - size;
      const cy = row * size - size;

      items.push(
        <View key={`diamond-${row}-${col}`} style={{
          position: 'absolute',
          left: cx - half * 0.7, top: cy - half * 0.7,
          width: half * 1.4, height: half * 1.4,
          borderWidth: 1.5, borderColor: color,
          opacity,
          transform: [{ rotate: '45deg' }],
        }} />,
        <View key={`inner-${row}-${col}`} style={{
          position: 'absolute',
          left: cx - half * 0.28, top: cy - half * 0.28,
          width: half * 0.56, height: half * 0.56,
          borderWidth: 1, borderColor: color,
          opacity: (opacity ?? 0.12) * 0.7,
        }} />,
      );
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
      {items}
    </View>
  );
};

const EducationPattern = ({ width, height, color, opacity }: Omit<PatternProps, 'category'>) => {
  const rowH = 38;
  const colW = 38;
  const items: React.ReactNode[] = [];
  const rows = Math.ceil(height / rowH) + 2;
  const cols = Math.ceil(width / colW) + 2;

  for (let row = 0; row < rows; row++) {
    const baseY = row * rowH;

    items.push(
      <View key={`line-${row}`} style={{
        position: 'absolute', left: 0,
        top: baseY + rowH * 0.72,
        width, height: 1,
        backgroundColor: color,
        opacity: (opacity ?? 0.12) * 0.5,
      }} />,
    );

    for (let col = 0; col < cols; col++) {
      const cx = col * colW - colW / 2;
      const bookY = baseY + rowH * 0.18;
      const armLen = colW * 0.3;

      items.push(
        <View key={`bl-${row}-${col}`} style={{
          position: 'absolute',
          left: cx - armLen, top: bookY,
          width: armLen * 1.2, height: 2,
          backgroundColor: color, opacity,
          transform: [{ rotate: '32deg' }],
        }} />,
        <View key={`br-${row}-${col}`} style={{
          position: 'absolute',
          left: cx, top: bookY,
          width: armLen * 1.2, height: 2,
          backgroundColor: color, opacity,
          transform: [{ rotate: '-32deg' }],
        }} />,
        <View key={`bs-${row}-${col}`} style={{
          position: 'absolute',
          left: cx - 1, top: bookY - 2,
          width: 2, height: armLen * 0.6,
          backgroundColor: color,
          opacity: Math.min(1, (opacity ?? 0.12) * 1.4),
        }} />,
      );
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
      {items}
    </View>
  );
};

const HealthPattern = ({ width, height, color, opacity }: Omit<PatternProps, 'category'>) => {
  const cell = 44;
  const arm = 9;
  const items: React.ReactNode[] = [];
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * cell - cell / 2;
      const cy = row * cell - cell / 2;

      items.push(
        <View key={`ch-${row}-${col}`} style={{
          position: 'absolute',
          left: cx - arm, top: cy - 1,
          width: arm * 2, height: 2,
          backgroundColor: color, opacity,
        }} />,
        <View key={`cv-${row}-${col}`} style={{
          position: 'absolute',
          left: cx - 1, top: cy - arm,
          width: 2, height: arm * 2,
          backgroundColor: color, opacity,
        }} />,
      );
    }

    const baseY = row * cell - cell / 2;
    const segments = Math.ceil(width / 8);
    for (let s = 0; s < segments; s++) {
      const x = s * 8;
      const phase = s % 6;
      let segH = 2;
      let offsetY = 0;
      if (phase === 2) { segH = 18; offsetY = -16; }
      else if (phase === 3) { segH = 12; offsetY = 4; }
      else if (phase === 4) { segH = 6; offsetY = -4; }

      items.push(
        <View key={`pulse-${row}-${s}`} style={{
          position: 'absolute',
          left: x, top: baseY + cell * 0.55 + offsetY,
          width: 7, height: segH,
          backgroundColor: color,
          opacity: (opacity ?? 0.12) * 0.45,
        }} />,
      );
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
      {items}
    </View>
  );
};

const OtherPattern = ({ width, height, color, opacity }: Omit<PatternProps, 'category'>) => {
  const size = 28;
  const triH = size * 0.866;
  const items: React.ReactNode[] = [];
  const cols = Math.ceil(width / size) + 3;
  const rows = Math.ceil(height / triH) + 3;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * size + (row % 2 === 0 ? 0 : size / 2) - size;
      const y = row * triH - triH;

      items.push(
        <View key={`tri-${row}-${col}`} style={{
          position: 'absolute',
          left: x, top: y,
          width: size, height: triH,
          borderLeftWidth: 1, borderBottomWidth: 1,
          borderLeftColor: color, borderBottomColor: color,
          opacity,
          transform: [{ rotate: row % 2 === 0 ? '0deg' : '180deg' }],
        }} />,
        <View key={`tri2-${row}-${col}`} style={{
          position: 'absolute',
          left: x, top: y,
          width: size, height: triH,
          borderRightWidth: 1, borderBottomWidth: 1,
          borderRightColor: color, borderBottomColor: color,
          opacity: (opacity ?? 0.12) * 0.6,
        }} />,
      );
    }
  }

  return (
    <View style={{ width, height, overflow: 'hidden', position: 'absolute', top: 0, left: 0 }}>
      {items}
    </View>
  );
};

const PATTERN_MAP: Record<Category, React.FC<Omit<PatternProps, 'category'>>> = {
  tech: TechPattern,
  corporate: CorporatePattern,
  social: SocialPattern,
  sports: SportsPattern,
  arts: ArtsPattern,
  education: EducationPattern,
  health: HealthPattern,
  other: OtherPattern,
};

export const CategoryPattern: React.FC<PatternProps> = ({
  category,
  width,
  height,
  color = '#ffffff',
  opacity = 0.12,
}) => {
  const Pattern = PATTERN_MAP[category] ?? PATTERN_MAP.other;
  return <Pattern width={width} height={height} color={color} opacity={opacity} />;
};

export default CategoryPattern;