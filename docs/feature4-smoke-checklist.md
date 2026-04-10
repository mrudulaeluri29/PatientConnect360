# Feature 4 — Smoke Test Checklist

## Test Accounts
- Patient: kkalra1@asu.edu / Kaustav123*
- Clinician: autlexia@gmail.com / Kaustav123*
- Admin: ripkaush@gmail.com / Kaustav123*
- MPOA/Family: testingmpoa@gmail.com / Kaustav123*

## Setup
```bash
mkdir -p ~/Downloads/PatientConnect360-main/docs
cat > ~/Downloads/PatientConnect360-main/docs/feature4-smoke-checklist.md << 'EOF'
# Feature 4 — Smoke Test Checklist

## Test Accounts
- Patient: kkalra1@asu.edu / Kaustav123*
- Clinician: autlexia@gmail.com / Kaustav123*
- Admin: ripkaush@gmail.com / Kaustav123*
- MPOA/Family: testingmpoa@gmail.com / Kaustav123*

## Setup
```bash
cd Server
npm run seed:feature4
```

## Smoke Test Steps

### 1. Clinician assigns HEP
- Login as clinician
- Tasks → Assign Exercises (HEP)
- Select kkalra1, fill form, click Assign Exercise
- ✅ Expected: "Exercise assigned successfully!"

### 2. Clinician adds prep tasks
- Tasks → Visit Prep Tasks
- Select upcoming visit
- Add "Have medication bottles ready"
- ✅ Expected: Task appears in list

### 3. Clinician edits prep task
- Click ✏️ Edit on a task
- Change text, click Save
- ✅ Expected: Text updates

### 4. Documentation gating — blocked
- Tasks → Needs Documentation
- Click a visit, type < 50 chars
- Click Complete Visit
- ✅ Expected: Red error message

### 5. Documentation gating — success
- Type >= 50 chars of notes
- Click Complete Visit
- ✅ Expected: Visit completed

### 6. Patient logs HEP completion
- Login as patient
- Exercises & Tasks → My Home Exercises
- Click Log Completion, add comment, Mark Done
- ✅ Expected: "Logged successfully!", adherence updates

### 7. Patient marks prep task done
- Exercises & Tasks → Visit Prep Tasks
- Click circle button on a task
- ✅ Expected: Task shows as done with green checkmark

### 8. MPOA views and completes HEP
- Login as testingmpoa@gmail.com
- Exercises & Tasks → select kkalra1
- Click Log Completion
- ✅ Expected: Completion logged for patient

### 9. Worklist shows overdue visits
- Login as clinician
- Tasks → Needs Documentation
- ✅ Expected: Past visits without notes appear
- ✅ Expected: Safety net shows completed visits missing notes
