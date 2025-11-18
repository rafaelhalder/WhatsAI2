/**
 * Shared chart theme configuration for consistent styling across all dashboard charts
 * Uses CSS variables to support both light and dark themes
 */

export const chartTheme = {
  // Grid styling
  grid: {
    stroke: 'hsl(var(--bc) / 0.15)', // base-content with 15% opacity for better visibility
    strokeDasharray: '3 3',
  },
  
  // Axis styling - increased opacity for better readability in dark mode
  axis: {
    tick: {
      fontSize: 12,
      fill: 'hsl(var(--bc) / 0.8)', // base-content with 80% opacity for better contrast
    },
    label: {
      fill: 'hsl(var(--bc) / 0.8)', // base-content with 80% opacity for better contrast
      fontSize: 12,
    },
  },
  
  // Tooltip styling - with proper opacity for dark mode readability
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--b2))', // base-200 for better contrast
      border: '1px solid hsl(var(--bc) / 0.3)',
      borderRadius: '0.5rem',
      color: 'hsl(var(--bc))', // full opacity for text
      boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.25)', // stronger shadow
    },
    labelStyle: {
      color: 'hsl(var(--bc))', // Use base-content for better readability
      fontWeight: 'bold',
    },
  },
  
  // Chart colors - using vibrant colors that work well in both light and dark modes
  colors: {
    primary: '#60a5fa', // Lighter blue - better visibility in dark mode
    success: '#34d399', // Lighter green - better visibility in dark mode
    error: '#f87171', // Lighter red - better visibility in dark mode
    warning: '#fbbf24', // Lighter orange - better visibility in dark mode
    secondary: '#a78bfa', // Lighter purple - better visibility in dark mode
    info: '#22d3ee', // Lighter cyan - better visibility in dark mode
  },
};

/**
 * Format hour to HH:00 format
 */
export const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

/**
 * Format date to pt-BR short format (DD/MM)
 */
export const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/**
 * Format month to pt-BR format (mmm yyyy)
 */
export const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
};

/**
 * Format currency to BRL
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};
