# Visual Testing Guide for Chart Improvements

## Quick Verification Steps

After deploying these changes, perform these visual checks to verify the improvements:

### 1. Open Dashboard in Light Mode

Navigate to the dashboard and verify:

#### PeakHoursChart (Horários de Pico)
- [ ] Title "Horários de Pico" is clearly visible
- [ ] Badge "Últimos 7 dias" has good contrast
- [ ] Blue bars are clearly visible
- [ ] X-axis labels (hours) are readable (should be gray, not too light/dark)
- [ ] Y-axis labels (message counts) are readable
- [ ] Y-axis label "Mensagens" is visible
- [ ] Grid lines are subtle but visible (light gray)
- [ ] Hover tooltip appears with white/light background
- [ ] Tooltip shows hour and message count clearly
- [ ] Top 5 hours badges at bottom are readable

#### MessagesChart (Mensagens nos Últimos 7 Dias)
- [ ] Title and icon are visible
- [ ] Three lines are distinct (blue=Total, green=Entregues, red=Falhas)
- [ ] X-axis dates are readable
- [ ] Y-axis numbers are readable
- [ ] Grid lines match PeakHours (same subtle gray)
- [ ] Hover tooltip has light background (matching theme)
- [ ] Legend at bottom shows all three categories
- [ ] Data points (dots) are visible on lines

#### CostsChart (Custos Mensais)
- [ ] Title "Custos Mensais" is visible
- [ ] Three lines are distinct (purple=Evolution API, cyan=Armazenamento, green=Total)
- [ ] Green "Total" line is slightly thicker
- [ ] X-axis month labels are readable
- [ ] Y-axis shows "R$" currency format
- [ ] Grid lines match other charts (same subtle gray)
- [ ] Hover tooltip shows BRL formatted values
- [ ] Bottom summary (Último Mês, Média, Total) is readable
- [ ] Currency values formatted correctly (R$ 1.234,56)

### 2. Switch to Dark Mode

Use system settings or theme toggle to switch to dark mode, then verify:

#### All Charts Should:
- [ ] Background colors invert properly (dark backgrounds)
- [ ] Text becomes lighter (light gray/white)
- [ ] Grid lines remain subtle but visible (lighter gray)
- [ ] Tooltips have dark backgrounds with light text
- [ ] All text remains readable (good contrast)
- [ ] Chart colors remain vibrant and visible
- [ ] No white "flashes" or harsh contrasts

#### Specific Dark Mode Checks:
- [ ] PeakHours tooltip is dark (NOT white anymore)
- [ ] Messages tooltip is dark (same as PeakHours)
- [ ] Costs tooltip is dark (matches others)
- [ ] All axis labels visible in dark mode
- [ ] Grid lines don't disappear

### 3. Consistency Check

Compare all three charts side-by-side:

#### Should Be Identical:
- [ ] Grid line style (dashed pattern)
- [ ] Grid line color/opacity
- [ ] Axis label font size (12px)
- [ ] Axis label color/opacity
- [ ] Tooltip background color
- [ ] Tooltip border style
- [ ] Card background color
- [ ] Card border color

#### Should Be Different (by design):
- [ ] Chart types (bar vs line)
- [ ] Line/bar colors (semantic colors)
- [ ] Content/data
- [ ] Specific labels

### 4. Interaction Testing

Test hover/interaction states:

- [ ] Hover over chart bars/lines highlights them
- [ ] Tooltip follows mouse cursor
- [ ] Tooltip content is accurate
- [ ] Tooltip has smooth animation
- [ ] Active dots on line charts are larger
- [ ] No flickering or performance issues

### 5. Responsive Design

Test on different screen sizes:

- [ ] Charts resize properly on mobile
- [ ] Text remains readable when chart is smaller
- [ ] Tooltips don't overflow screen
- [ ] All elements maintain proper spacing
- [ ] No horizontal scrolling needed

### 6. Accessibility Check

- [ ] All charts readable without color (use legends/labels)
- [ ] Text meets contrast requirements
- [ ] Tooltips provide full context
- [ ] Charts work with keyboard navigation (if supported)

## Expected Visual Improvements

### Before vs After

#### PeakHoursChart Tooltip:
- **Before**: White background (harsh in dark mode)
- **After**: Theme-adaptive background (light in light mode, dark in dark mode)

#### MessagesChart Tooltip:
- **Before**: Dark background (harsh in light mode)
- **After**: Theme-adaptive background (matches current theme)

#### CostsChart Grid:
- **Before**: Black grid lines (too harsh)
- **After**: Subtle gray grid lines (10% opacity)

#### All Charts Text:
- **Before**: Various colors and opacity levels
- **After**: Consistent 70% opacity for labels, full opacity for data

## Common Issues to Watch For

### ❌ Problems that SHOULD NOT appear anymore:
- White tooltips in dark mode
- Dark tooltips in light mode
- Black grid lines (too harsh)
- Text too light (hard to read)
- Text too dark (harsh)
- Inconsistent styling between charts
- Charts not adapting to theme

### ✅ What you SHOULD see:
- Smooth theme transitions
- Consistent styling across all charts
- Good text contrast in both modes
- Subtle but visible grid lines
- Professional, cohesive look
- Comfortable viewing experience

## Taking Screenshots

If you want to document the improvements:

### Light Mode Screenshots:
1. Full dashboard view
2. PeakHours chart closeup
3. Messages chart closeup
4. Costs chart closeup
5. Tooltip on each chart

### Dark Mode Screenshots:
1. Full dashboard view (to show theme consistency)
2. Side-by-side comparison of a chart in both modes

## Reporting Issues

If you find any visual issues:

1. **Note the specific chart**: PeakHours, Messages, or Costs
2. **Note the theme**: Light or dark mode
3. **Describe the issue**: What looks wrong?
4. **Take a screenshot**: Visual evidence helps
5. **Check browser console**: Any JavaScript errors?

## Developer Notes

The key changes that improved these visuals:

1. **CSS Variables**: Using `hsl(var(--bc) / 0.7)` for theme-adaptive colors
2. **Opacity Levels**: 10% for grid, 70% for text, 100% for data
3. **Consistent Theme**: All charts use same `chartTheme` configuration
4. **Semantic Colors**: Named constants like `primary`, `success`, `error`

For implementation details, see:
- `client/src/features/dashboard/utils/chartTheme.ts` - Theme configuration
- `client/src/features/dashboard/CHART_STYLING_GUIDE.md` - Complete guide
- `CHART_IMPROVEMENTS.md` - Before/after comparison

---

**Last Updated**: November 11, 2025  
**Version**: 1.0  
**Status**: Ready for testing
