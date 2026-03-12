# TODO: Question Paper Generator - Implementation Plan

## Summary of Understanding:
- Current flow has difficulty and RBT sliders in Step 2 (configure.html)
- User wants these sliders ONLY in Custom mode (custom.html)
- Auto mode should automatically use equal percentages (33% each for Easy/Medium/Hard, equal for 6 RBT levels)
- Custom mode should only show percentages, no question preview
- Navigation buttons should be beside each other in custom mode

## Changes Required:

### 1. Configure.html (Step 2)
- REMOVE: Difficulty percentage sliders
- REMOVE: RBT level percentage sliders  
- KEEP: Number of questions input
- KEEP: Question type selection (MCQ/Theory/Both)
- Add note explaining percentages will be set in Custom mode

### 2. Options.html (Step 3)
- Add explanation that Auto mode uses equal distribution
- Improve clarity on the two options

### 3. Custom.html (Step 5 - Custom Mode)
- Already has difficulty and RBT sliders (keep them)
- REMOVE: Any question preview section
- KEEP: Only percentages with sliders
- Navigation buttons should be beside each other (already correct)

### 4. Generate.html (Step 4 - Auto Mode)
- Add info showing equal distribution will be used
- Keep previous year papers upload for LSTM

### 5. App.py (Backend)
- Modify step2_configure: Don't save difficulty/rbt percentages
- Modify step4_generate: Use equal percentages automatically
- Modify step5_custom: Use custom percentages from form

### 6. Results.html
- Ensure course outcomes (CO1-CO5) are properly displayed
- Already has CO display - verify it's correct

## Implementation Steps:
1. [x] Update configure.html - Remove difficulty/RBT sliders
2. [x] Update generate.html - Add auto-balance info
3. [x] Update custom.html - Already has only percentages (no changes needed)
4. [x] Update app.py - Fix backend logic
5. [x] Test the complete flow - Flask server running on http://127.0.0.1:5000

