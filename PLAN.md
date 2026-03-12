# Plan: Question Paper Generator - Modifications

## Information Gathered:

### Current Flow:
1. **Step 1 (upload.html)**: Upload CSV question bank
2. **Step 2 (configure.html)**: Configure number, type, AND difficulty/RBT percentages
3. **Step 3 (options.html)**: Header info (college, course, code) + Generation mode (Auto/Custom)
4. **Step 4 (generate.html)**: Upload previous year papers + generate
5. **Step 5 (custom.html)**: Custom percentages (currently duplicates configure.html)
6. **Step 6 (results.html)**: View and download question paper

### Issues to Fix:
- Difficulty and RBT percentages are shown in BOTH Step 2 AND Step 5 (Custom mode) - redundant
- Auto mode should use equal percentages by default (33% each Easy/Medium/Hard, equal for 6 RBT levels)
- Custom mode should ONLY show percentages, no question preview
- Navigation buttons should be beside each other in custom mode
- Need to ensure Course Outcomes (CO) are properly displayed

## Plan:

### 1. configure.html (Step 2) - REMOVE sliders
- Remove difficulty percentage sliders (Easy/Medium/Hard)
- Remove RBT level percentage sliders (6 levels)
- Keep only:
  - Number of questions input
  - Question type selection (MCQ/Theory/Both)
- Add note explaining percentages will be set in Custom generation mode

### 2. options.html (Step 3) - No major changes needed
- Header info: College name, Course name, Course code
- Generation mode: Auto-balanced vs Custom
- Add clarifying text that Auto uses equal distribution

### 3. generate.html (Step 4 - Auto Mode)
- Show info that equal distribution is being used:
  - Easy: 33%, Medium: 34%, Hard: 33%
  - 6 RBT levels equally covered (~17% each)
- Keep previous year papers upload (LSTM analysis)
- Keep "Generate Question Paper" button

### 4. custom.html (Step 5 - Custom Mode)
- KEEP: Difficulty sliders (Easy/Medium/Hard)
- KEEP: RBT level sliders (6 levels)
- REMOVE: Any question preview section
- KEEP: Navigation buttons (Previous + Generate) - already beside each other

### 5. app.py (Backend)
- **step2_configure()**: Don't save difficulty/rbt percentages to session
- **step4_generate()**: Use fixed equal percentages (auto mode)
- **step5_custom()**: Read custom percentages from form

### 6. results.html
- Verify CO display is correct (CO1, CO2, CO3, CO4, CO5)
- Already has proper structure

## Dependent Files to be Edited:
1. `templates/configure.html` - Remove sliders
2. `templates/custom.html` - Keep only percentages
3. `templates/generate.html` - Add auto-balance info
4. `app.py` - Fix backend logic

## Followup Steps:
1. Run the Flask application to test
2. Verify complete flow works
3. Check UI is user-friendly

---

<ask_followup_question>
Please confirm this plan is correct. Should I proceed with implementing these changes?
</ask_followup_question>

