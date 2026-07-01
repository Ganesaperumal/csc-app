export const getUserColor = (name: string) => {
  if (!name) return { text: '#4f46e5', bg: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(147,51,234,0.1))' };
  
  const colors = [
    { text: '#4f46e5', bg: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(147,51,234,0.1))' }, // Indigo-Purple
    { text: '#059669', bg: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.1))' }, // Emerald
    { text: '#e11d48', bg: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(225,29,72,0.1))' },   // Rose
    { text: '#0284c7', bg: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(2,132,199,0.1))' },  // Light Blue
    { text: '#d97706', bg: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.1))' },  // Amber
    { text: '#c026d3', bg: 'linear-gradient(135deg, rgba(217,70,239,0.1), rgba(192,38,211,0.1))' }, // Fuchsia
    { text: '#1d4ed8', bg: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(29,78,216,0.1))' },  // Blue
    { text: '#0f766e', bg: 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(15,118,110,0.1))' }, // Teal
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};
