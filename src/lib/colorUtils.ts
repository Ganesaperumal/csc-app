export const getUserColor = (name: string) => {
  if (!name) return { text: '#6366f1', bg: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))' };
  
  const colors = [
    { text: '#6366f1', bg: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))' }, // Indigo-Purple
    { text: '#10b981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))' }, // Emerald
    { text: '#f43f5e', bg: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(225,29,72,0.15))' },   // Rose
    { text: '#0ea5e9', bg: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(2,132,199,0.15))' },  // Light Blue
    { text: '#f59e0b', bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.15))' },  // Amber
    { text: '#d946ef', bg: 'linear-gradient(135deg, rgba(217,70,239,0.15), rgba(192,38,211,0.15))' }, // Fuchsia
    { text: '#3b82f6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(29,78,216,0.15))' },  // Blue
    { text: '#14b8a6', bg: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(15,118,110,0.15))' }, // Teal
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
