import React from 'react';

export const RoyalArchSVG: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-full h-auto',
  color = '#C9A45C',
}) => (
  <svg
    viewBox="0 0 400 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M20 110 C 20 60, 100 20, 200 20 C 300 20, 380 60, 380 110"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M40 110 C 40 70, 110 35, 200 35 C 290 35, 360 70, 360 110"
      stroke={color}
      strokeWidth="1"
      strokeDasharray="4 4"
    />
    <circle cx="200" cy="20" r="4" fill={color} />
    <circle cx="160" cy="26" r="2.5" fill={color} />
    <circle cx="240" cy="26" r="2.5" fill={color} />
    <circle cx="120" cy="42" r="2" fill={color} />
    <circle cx="280" cy="42" r="2" fill={color} />
  </svg>
);

export const LotusMotifSVG: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-8 h-8',
  color = '#B38B45',
}) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Central Petal */}
    <path
      d="M50 15 C45 35 40 55 50 85 C60 55 55 35 50 15 Z"
      fill={color}
      fillOpacity="0.25"
      stroke={color}
      strokeWidth="1.5"
    />
    {/* Left Petal */}
    <path
      d="M50 85 C35 65 25 45 32 30 C38 45 45 65 50 85 Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    {/* Right Petal */}
    <path
      d="M50 85 C65 65 75 45 68 30 C62 45 55 65 50 85 Z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.5"
    />
    {/* Outer Left */}
    <path
      d="M50 85 C25 75 12 55 18 42 C24 55 38 72 50 85 Z"
      stroke={color}
      strokeWidth="1.2"
    />
    {/* Outer Right */}
    <path
      d="M50 85 C75 75 88 55 82 42 C76 55 62 72 50 85 Z"
      stroke={color}
      strokeWidth="1.2"
    />
    {/* Water ripple base */}
    <path
      d="M20 90 Q 50 96 80 90"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const MandalaCornerSVG: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-24 h-24',
  color = '#C9A45C',
}) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="0" cy="0" r="95" stroke={color} strokeWidth="1" strokeDasharray="3 3" />
    <circle cx="0" cy="0" r="80" stroke={color} strokeWidth="1.5" />
    <circle cx="0" cy="0" r="60" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
    <circle cx="0" cy="0" r="40" stroke={color} strokeWidth="1.5" />
    <path d="M0 0 L70 70" stroke={color} strokeWidth="0.8" />
    <path d="M0 0 L85 35" stroke={color} strokeWidth="0.8" />
    <path d="M0 0 L35 85" stroke={color} strokeWidth="0.8" />
  </svg>
);

export const TempleArchSVG: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-full h-auto',
  color = '#C9A45C',
}) => (
  <svg
    viewBox="0 0 400 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Gopuram stepped tier arch */}
    <path
      d="M40 110 L40 70 L90 70 L90 45 L150 45 L150 25 L200 15 L250 25 L250 45 L310 45 L310 70 L360 70 L360 110"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="200" cy="15" r="4.5" fill={color} />
    <circle cx="150" cy="25" r="2.5" fill={color} />
    <circle cx="250" cy="25" r="2.5" fill={color} />
    <path d="M120 70 Q 200 40 280 70" stroke={color} strokeWidth="1" strokeDasharray="3 3" />
  </svg>
);

export const ScallopedArchSVG: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-full h-auto',
  color = '#C9A45C',
}) => (
  <svg
    viewBox="0 0 400 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* 7-lobe scalloped floral arch */}
    <path
      d="M30 110 Q 50 65 90 70 Q 130 35 170 45 Q 200 20 230 45 Q 270 35 310 70 Q 350 65 370 110"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M50 110 Q 70 75 105 80 Q 140 50 175 60 Q 200 35 225 60 Q 260 50 295 80 Q 330 75 350 110"
      stroke={color}
      strokeWidth="1"
      strokeDasharray="4 4"
    />
    <circle cx="200" cy="20" r="3.5" fill={color} />
  </svg>
);

export const MinimalOvalArchSVG: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-full h-auto',
  color = '#C9A45C',
}) => (
  <svg
    viewBox="0 0 400 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M50 110 C 50 40, 120 20, 200 20 C 280 20, 350 40, 350 110"
      stroke={color}
      strokeWidth="1.2"
    />
    <line x1="80" y1="110" x2="320" y2="110" stroke={color} strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const PeacockMotifSVG: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-8 h-8',
  color = '#C9A45C',
}) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Stylized royal peacock eye feather */}
    <ellipse cx="50" cy="38" rx="28" ry="32" stroke={color} strokeWidth="1.5" />
    <ellipse cx="50" cy="38" rx="18" ry="22" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.2" />
    <circle cx="50" cy="38" r="8" fill={color} />
    <path d="M50 70 L50 95" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M50 78 Q 35 84 25 80" stroke={color} strokeWidth="1" />
    <path d="M50 78 Q 65 84 75 80" stroke={color} strokeWidth="1" />
  </svg>
);

export const DynamicArchRenderer: React.FC<{
  archStyle?: 'royal_arch' | 'temple_arch' | 'scalloped' | 'minimal_oval' | 'none';
  color?: string;
  className?: string;
}> = ({ archStyle = 'royal_arch', color = '#C9A45C', className = 'w-full h-auto' }) => {
  switch (archStyle) {
    case 'temple_arch':
      return <TempleArchSVG color={color} className={className} />;
    case 'scalloped':
      return <ScallopedArchSVG color={color} className={className} />;
    case 'minimal_oval':
      return <MinimalOvalArchSVG color={color} className={className} />;
    case 'none':
      return <div className="h-4" />;
    case 'royal_arch':
    default:
      return <RoyalArchSVG color={color} className={className} />;
  }
};

export const DynamicMotifRenderer: React.FC<{
  motif?: 'marigold' | 'lotus' | 'peacock' | 'mandala' | 'botanical' | 'geometric';
  color?: string;
  className?: string;
}> = ({ motif = 'lotus', color = '#B38B45', className = 'w-8 h-8' }) => {
  switch (motif) {
    case 'peacock':
      return <PeacockMotifSVG color={color} className={className} />;
    case 'mandala':
      return <MandalaCornerSVG color={color} className={className} />;
    case 'marigold':
      return (
        <svg viewBox="0 0 100 100" fill="none" className={className}>
          <circle cx="50" cy="50" r="28" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" />
          <circle cx="50" cy="50" r="14" fill={color} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse key={deg} cx="50" cy="22" rx="6" ry="12" fill={color} fillOpacity="0.5" transform={`rotate(${deg} 50 50)`} />
          ))}
        </svg>
      );
    case 'botanical':
      return (
        <svg viewBox="0 0 100 100" fill="none" className={className}>
          <path d="M50 90 Q 50 40 75 15" stroke={color} strokeWidth="1.5" />
          <ellipse cx="65" cy="30" rx="10" ry="5" transform="rotate(-30 65 30)" fill={color} fillOpacity="0.3" stroke={color} />
          <ellipse cx="45" cy="50" rx="10" ry="5" transform="rotate(30 45 50)" fill={color} fillOpacity="0.3" stroke={color} />
          <ellipse cx="60" cy="65" rx="8" ry="4" transform="rotate(-25 60 65)" fill={color} fillOpacity="0.3" stroke={color} />
        </svg>
      );
    case 'lotus':
    default:
      return <LotusMotifSVG color={color} className={className} />;
  }
};

export const DividerOrnament: React.FC<{ color?: string; className?: string }> = ({
  color = '#C9A45C',
  className = 'my-6',
}) => (
  <div className={`flex items-center justify-center gap-3 ${className}`}>
    <div className="h-[1px] w-16 sm:w-28 bg-gradient-to-r from-transparent to-current opacity-40" style={{ color }} />
    <div className="flex items-center gap-1.5 opacity-80" style={{ color }}>
      <span className="w-1.5 h-1.5 rotate-45 border border-current" />
      <span className="w-2.5 h-2.5 rotate-45 bg-current" />
      <span className="w-1.5 h-1.5 rotate-45 border border-current" />
    </div>
    <div className="h-[1px] w-16 sm:w-28 bg-gradient-to-l from-transparent to-current opacity-40" style={{ color }} />
  </div>
);


