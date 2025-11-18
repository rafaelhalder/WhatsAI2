# Dashboard Chart Styling Guide

## Overview
This guide documents the standardized styling approach for all dashboard charts to ensure visual consistency, readability, and proper theme support.

## Design Principles

### 1. Theme-Based Colors
All charts use DaisyUI CSS variables to support both light and dark themes:
- `hsl(var(--bc))` - Base content color (text)
- `hsl(var(--b1))` - Base 100 (backgrounds)
- `hsl(var(--p))` - Primary color (accents)

### 2. Opacity for Visual Hierarchy
- Grid lines: 15% opacity (`hsl(var(--bc) / 0.15)`) - improved visibility in dark mode
- Axis labels/ticks: 80% opacity (`hsl(var(--bc) / 0.8)`) - better readability in dark mode
- Body text: 100% opacity (`hsl(var(--bc))`)
- Secondary text: 50-60% opacity (`hsl(var(--bc) / 0.5)`)

### 3. Consistent Chart Colors (Dark Mode Optimized)
```typescript
colors: {
  primary: '#60a5fa',   // Lighter Blue - Better visibility in dark mode
  success: '#34d399',   // Lighter Green - Better visibility in dark mode
  error: '#f87171',     // Lighter Red - Better visibility in dark mode
  warning: '#fbbf24',   // Lighter Orange - Better visibility in dark mode
  secondary: '#a78bfa', // Lighter Purple - Better visibility in dark mode
  info: '#22d3ee',      // Lighter Cyan - Better visibility in dark mode
}
```
Note: These lighter shades work well in both light and dark modes, providing good contrast and visibility.

## Color Usage by Chart

### PeakHoursChart (Bar Chart)
- **Bar color**: Primary blue (`#60a5fa`)
- **Grid**: 15% opacity base-content
- **Axes**: 80% opacity base-content
- **Tooltip**: Base-200 background with base-content label

### MessagesChart (Line Chart)
- **Total messages**: Primary blue (`#60a5fa`)
- **Delivered**: Success green (`#34d399`)
- **Failed**: Error red (`#f87171`)
- **Grid/Axes**: Same as PeakHoursChart
- **Legend**: Auto-generated from line names

### CostsChart (Line Chart)
- **Evolution API**: Secondary purple (`#a78bfa`)
- **Storage**: Info cyan (`#22d3ee`)
- **Total**: Success green (`#34d399`) with thicker line (3px)
- **Grid/Axes**: Same as other charts
- **Currency formatting**: BRL (R$)

### InstancesStatusChart (Donut Chart)
- **Online**: Success color (via DaisyUI class)
- **Offline**: Error color (via DaisyUI class)
- **Connecting**: Warning color (via DaisyUI class)

## Readability Guidelines

### Text Contrast
All text must meet WCAG AA contrast requirements:
- Axis labels: 80% opacity ensures better readability in dark mode
- Chart values: Use full opacity colors for maximum contrast
- Tooltips: High contrast background (base-200) with full opacity text for readability in both themes

### Grid Lines
- Subtle grid lines (15% opacity) provide guidance without distraction, with improved visibility in dark mode
- Dashed pattern (3-3) improves visual clarity
- Grid color adapts to theme automatically

### Data Point Visibility
- Line charts: 4px radius dots with 2px stroke
- Active dots: 6px radius for better hover feedback
- Bar charts: 8px top radius for modern look

## Accessibility Features

1. **Color Independence**: Charts work without color (patterns, labels, legends)
2. **High Contrast**: 80% opacity minimum for all text to ensure readability in dark mode
3. **Theme Support**: Automatic adaptation to light/dark themes with optimized colors
4. **Clear Labels**: All axes and data points properly labeled
5. **Tooltips**: Contextual information on hover with high contrast background (base-200) and full opacity text

## Implementation

### Using the Chart Theme
```typescript
import { chartTheme } from '../utils/chartTheme';

// Grid styling
<CartesianGrid 
  strokeDasharray={chartTheme.grid.strokeDasharray} 
  stroke={chartTheme.grid.stroke}
/>

// Axis styling
<XAxis tick={chartTheme.axis.tick} />
<YAxis tick={chartTheme.axis.tick} />

// Tooltip styling
<Tooltip
  contentStyle={chartTheme.tooltip.contentStyle}
  labelStyle={chartTheme.tooltip.labelStyle}
/>

// Colors
<Bar fill={chartTheme.colors.primary} />
<Line stroke={chartTheme.colors.success} />
```

### Utility Functions
```typescript
import { formatHour, formatDateShort, formatMonth, formatCurrency } from '../utils/chartTheme';

// Format hour (24h format)
formatHour(14) // "14:00"

// Format date (DD/MM)
formatDateShort("2024-01-15") // "15/01"

// Format month (mmm yyyy)
formatMonth("2024-01") // "jan 2024"

// Format currency (BRL)
formatCurrency(1234.56) // "R$ 1.234,56"
```

## Testing Checklist

When modifying charts, verify:
- [ ] Colors adapt correctly in dark mode
- [ ] Text is readable in both themes
- [ ] Grid lines are visible but subtle
- [ ] Tooltips have proper contrast
- [ ] Data points are easily identifiable
- [ ] Chart maintains consistent spacing
- [ ] Legend (if present) is clear
- [ ] Axis labels don't overlap
- [ ] Loading states work properly
- [ ] Empty states are handled gracefully

## Future Improvements

1. Consider adding color-blind friendly palette option
2. Add animation preferences support
3. Implement chart export functionality
4. Add keyboard navigation support
5. Consider adding data table alternative views

## References

- DaisyUI Documentation: https://daisyui.com/
- Recharts Documentation: https://recharts.org/
- WCAG Contrast Guidelines: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
