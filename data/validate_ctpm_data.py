import pandas as pd

# ─────────────────────────────────────────────
# LOAD ALL CSVs
# ─────────────────────────────────────────────
patients_df  = pd.read_csv("patients.csv")
diseases_df  = pd.read_csv("diseases.csv")
lab_tests_df = pd.read_csv("lab_tests.csv")
meds_df      = pd.read_csv("medications.csv")
trials_df    = pd.read_csv("clinical_trials.csv")
diagnosis_df = pd.read_csv("diagnoses.csv")
lab_res_df   = pd.read_csv("lab_results.csv")
pat_med_df   = pd.read_csv("patient_meds.csv")
elig_df      = pd.read_csv("eligibility.csv")
match_df     = pd.read_csv("patient_trial_match.csv")
enroll_df    = pd.read_csv("enrollment.csv")

errors = 0

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def check_pk(df, pk_col, table):
    global errors
    dupes = df[pk_col].duplicated().sum()
    nulls = df[pk_col].isnull().sum()
    status = "✅" if (dupes == 0 and nulls == 0) else "❌"
    if dupes > 0 or nulls > 0:
        errors += 1
    print(f"  {status} [{table}] PK '{pk_col}' → dupes={dupes}, nulls={nulls}")

def check_fk(child_df, fk_col, parent_df, pk_col, label):
    global errors
    # ignore NULLs in FK (nullable FKs are allowed)
    non_null = child_df[fk_col].dropna()
    invalid  = ~non_null.isin(parent_df[pk_col])
    count    = invalid.sum()
    status   = "✅" if count == 0 else "❌"
    if count > 0:
        errors += 1
    print(f"  {status} [{label}] invalid FK rows={count}")

def check_domain(df, col, allowed, label):
    global errors
    non_null = df[col].dropna()
    invalid  = ~non_null.isin(allowed)
    count    = invalid.sum()
    status   = "✅" if count == 0 else "❌"
    if count > 0:
        errors += 1
        print(f"  {status} [{label}] invalid values={count} → {non_null[invalid].unique().tolist()}")
    else:
        print(f"  {status} [{label}] all values valid")

def check_notnull(df, col, label):
    global errors
    nulls  = df[col].isnull().sum()
    status = "✅" if nulls == 0 else "❌"
    if nulls > 0:
        errors += 1
    print(f"  {status} [{label}] nulls={nulls}")

# ─────────────────────────────────────────────
# 1. PRIMARY KEY CHECKS
# ─────────────────────────────────────────────
print("\n══════════════════════════════════")
print("  LAYER 1 — PRIMARY KEY CHECKS")
print("══════════════════════════════════")
check_pk(patients_df,  "PatientID",    "PATIENT")
check_pk(diseases_df,  "DiseaseID",    "DISEASE")
check_pk(lab_tests_df, "TestID",       "LAB_TEST")
check_pk(meds_df,      "MedicationID", "MEDICATION")
check_pk(trials_df,    "TrialID",      "CLINICAL_TRIAL")
check_pk(diagnosis_df, "DiagnosisID",  "DIAGNOSIS")
check_pk(lab_res_df,   "ResultID",     "LAB_RESULT")
check_pk(pat_med_df,   "PatientMedID", "PATIENT_MEDICATION")
check_pk(elig_df,      "CriteriaID",   "ELIGIBILITY_CRITERIA")
check_pk(match_df,     "MatchID",      "PATIENT_TRIAL_MATCH")
check_pk(enroll_df,    "EnrollmentID", "ENROLLMENT")

# ─────────────────────────────────────────────
# 2. FOREIGN KEY CHECKS
# ─────────────────────────────────────────────
print("\n══════════════════════════════════")
print("  LAYER 2 — FOREIGN KEY CHECKS")
print("══════════════════════════════════")

# DIAGNOSIS
check_fk(diagnosis_df, "PatientID", patients_df, "PatientID", "DIAGNOSIS → PATIENT")
check_fk(diagnosis_df, "DiseaseID", diseases_df, "DiseaseID", "DIAGNOSIS → DISEASE")

# LAB_RESULT
check_fk(lab_res_df, "PatientID", patients_df,  "PatientID", "LAB_RESULT → PATIENT")
check_fk(lab_res_df, "TestID",    lab_tests_df, "TestID",    "LAB_RESULT → LAB_TEST")

# PATIENT_MEDICATION
check_fk(pat_med_df, "PatientID",    patients_df, "PatientID",    "PATIENT_MEDICATION → PATIENT")
check_fk(pat_med_df, "MedicationID", meds_df,     "MedicationID", "PATIENT_MEDICATION → MEDICATION")

# CLINICAL_TRIAL
check_fk(trials_df, "TargetDisease", diseases_df, "DiseaseID", "CLINICAL_TRIAL → DISEASE")

# ELIGIBILITY_CRITERIA
check_fk(elig_df, "TrialID",         trials_df,   "TrialID",   "ELIGIBILITY_CRITERIA → CLINICAL_TRIAL")
check_fk(elig_df, "RequiredDisease", diseases_df, "DiseaseID", "ELIGIBILITY_CRITERIA → DISEASE")

# PATIENT_TRIAL_MATCH
check_fk(match_df, "PatientID", patients_df, "PatientID", "PATIENT_TRIAL_MATCH → PATIENT")
check_fk(match_df, "TrialID",   trials_df,   "TrialID",   "PATIENT_TRIAL_MATCH → CLINICAL_TRIAL")

# ENROLLMENT
check_fk(enroll_df, "PatientID", patients_df, "PatientID", "ENROLLMENT → PATIENT")
check_fk(enroll_df, "TrialID",   trials_df,   "TrialID",   "ENROLLMENT → CLINICAL_TRIAL")

# ─────────────────────────────────────────────
# 3. DOMAIN / ENUM CHECKS
# ─────────────────────────────────────────────
print("\n══════════════════════════════════")
print("  LAYER 3 — DOMAIN/ENUM CHECKS")
print("══════════════════════════════════")

check_domain(patients_df,  "Gender",
    ["M","F"],
    "PATIENT.Gender")

check_domain(patients_df, "BloodGroup",
    ["A+","A-","B+","B-","O+","O-","AB+","AB-"],
    "PATIENT.BloodGroup")

check_domain(diagnosis_df, "Severity",
    ["Mild","Moderate","Severe"],
    "DIAGNOSIS.Severity")

check_domain(diagnosis_df, "Status",
    ["Active","Resolved"],
    "DIAGNOSIS.Status")

check_domain(trials_df, "Phase",
    ["I","II","III","IV"],
    "CLINICAL_TRIAL.Phase")

check_domain(trials_df, "TrialStatus",
    ["Open","Closed","Suspended"],
    "CLINICAL_TRIAL.TrialStatus")

check_domain(elig_df, "CriteriaType",
    ["Inclusion","Exclusion"],
    "ELIGIBILITY_CRITERIA.CriteriaType")

check_domain(match_df, "EligibilityStatus",
    ["Eligible","Not Eligible"],
    "PATIENT_TRIAL_MATCH.EligibilityStatus")

check_domain(enroll_df, "ConsentStatus",
    ["Given","Withdrawn","Pending"],
    "ENROLLMENT.ConsentStatus")

check_domain(enroll_df, "EnrollmentStatus",
    ["Screening","Enrolled","Rejected","Withdrawn","Completed"],
    "ENROLLMENT.EnrollmentStatus")

check_domain(pat_med_df, "CurrentStatus",
    ["Active","Completed","Discontinued"],
    "PATIENT_MEDICATION.CurrentStatus")

# ─────────────────────────────────────────────
# 4. NOT NULL CHECKS (required fields)
# ─────────────────────────────────────────────
print("\n══════════════════════════════════")
print("  LAYER 4 — NOT NULL CHECKS")
print("══════════════════════════════════")

check_notnull(patients_df,  "Name",          "PATIENT.Name")
check_notnull(patients_df,  "DateOfBirth",   "PATIENT.DateOfBirth")
check_notnull(patients_df,  "Gender",        "PATIENT.Gender")
check_notnull(diseases_df,  "DiseaseName",   "DISEASE.DiseaseName")
check_notnull(diseases_df,  "ICDCode",       "DISEASE.ICDCode")
check_notnull(trials_df,    "TrialTitle",    "CLINICAL_TRIAL.TrialTitle")
check_notnull(trials_df,    "TrialStatus",   "CLINICAL_TRIAL.TrialStatus")
check_notnull(diagnosis_df, "DiagnosisDate", "DIAGNOSIS.DiagnosisDate")
check_notnull(lab_res_df,   "TestValue",     "LAB_RESULT.TestValue")
check_notnull(lab_res_df,   "TestDate",      "LAB_RESULT.TestDate")
check_notnull(enroll_df,    "ConsentDate",   "ENROLLMENT.ConsentDate")

# ─────────────────────────────────────────────
# 5. LOGICAL / BUSINESS RULE CHECKS
# ─────────────────────────────────────────────
print("\n══════════════════════════════════")
print("  LAYER 5 — LOGICAL CHECKS")
print("══════════════════════════════════")

# PATIENT_MEDICATION: StartDate < EndDate
pat_med_df["StartDate"] = pd.to_datetime(pat_med_df["StartDate"])
pat_med_df["EndDate"]   = pd.to_datetime(pat_med_df["EndDate"])
dated = pat_med_df.dropna(subset=["EndDate"])
bad_dates = dated[dated["StartDate"] >= dated["EndDate"]]
status = "✅" if len(bad_dates) == 0 else "❌"
if len(bad_dates) > 0: errors += 1
print(f"  {status} [PATIENT_MEDICATION] StartDate >= EndDate → {len(bad_dates)} bad rows")

# ELIGIBILITY_CRITERIA: AgeMin < AgeMax
bad_age = elig_df[elig_df["AgeMin"] >= elig_df["AgeMax"]]
status  = "✅" if len(bad_age) == 0 else "❌"
if len(bad_age) > 0: errors += 1
print(f"  {status} [ELIGIBILITY_CRITERIA] AgeMin >= AgeMax → {len(bad_age)} bad rows")

# PATIENT_TRIAL_MATCH: MatchScore in 0-100
bad_score = match_df[~match_df["MatchScore"].between(0, 100)]
status    = "✅" if len(bad_score) == 0 else "❌"
if len(bad_score) > 0: errors += 1
print(f"  {status} [PATIENT_TRIAL_MATCH] MatchScore out of 0-100 → {len(bad_score)} bad rows")

# ENROLLMENT must be a subset of PATIENT_TRIAL_MATCH pairs
enroll_pairs = set(zip(enroll_df["PatientID"], enroll_df["TrialID"]))
match_pairs  = set(zip(match_df["PatientID"],  match_df["TrialID"]))
orphans      = enroll_pairs - match_pairs
status       = "✅" if len(orphans) == 0 else "❌"
if len(orphans) > 0: errors += 1
print(f"  {status} [ENROLLMENT] enrollments without a match record → {len(orphans)}")

# PATIENT_TRIAL_MATCH: no duplicate (PatientID, TrialID) pairs
dupe_pairs = match_df.duplicated(subset=["PatientID","TrialID"]).sum()
status     = "✅" if dupe_pairs == 0 else "❌"
if dupe_pairs > 0: errors += 1
print(f"  {status} [PATIENT_TRIAL_MATCH] duplicate (Patient,Trial) pairs → {dupe_pairs}")

# ENROLLMENT: no duplicate (PatientID, TrialID) pairs
dupe_enroll = enroll_df.duplicated(subset=["PatientID","TrialID"]).sum()
status      = "✅" if dupe_enroll == 0 else "❌"
if dupe_enroll > 0: errors += 1
print(f"  {status} [ENROLLMENT] duplicate (Patient,Trial) pairs → {dupe_enroll}")

# PATIENT: Height and Weight in realistic ranges
bad_height = patients_df[~patients_df["Height"].between(100, 220)]
bad_weight = patients_df[~patients_df["Weight"].between(20, 200)]
for label, bad in [("Height (100-220cm)", bad_height), ("Weight (20-200kg)", bad_weight)]:
    status = "✅" if len(bad) == 0 else "❌"
    if len(bad) > 0: errors += 1
    print(f"  {status} [PATIENT] unrealistic {label} → {len(bad)} rows")

# ─────────────────────────────────────────────
# 6. QUICK ROW COUNT SUMMARY
# ─────────────────────────────────────────────
print("\n══════════════════════════════════")
print("  ROW COUNT SUMMARY")
print("══════════════════════════════════")
tables = {
    "PATIENT":              patients_df,
    "DISEASE":              diseases_df,
    "LAB_TEST":             lab_tests_df,
    "MEDICATION":           meds_df,
    "CLINICAL_TRIAL":       trials_df,
    "DIAGNOSIS":            diagnosis_df,
    "LAB_RESULT":           lab_res_df,
    "PATIENT_MEDICATION":   pat_med_df,
    "ELIGIBILITY_CRITERIA": elig_df,
    "PATIENT_TRIAL_MATCH":  match_df,
    "ENROLLMENT":           enroll_df,
}
for name, df in tables.items():
    print(f"  {name:25s} → {len(df):>5} rows")

# ─────────────────────────────────────────────
# FINAL RESULT
# ─────────────────────────────────────────────
print("\n══════════════════════════════════")
if errors == 0:
    print("  ✅ ALL CHECKS PASSED — data is clean and safe to load into MySQL.")
else:
    print(f"  ❌ {errors} CHECK(S) FAILED — fix issues before loading into MySQL.")
print("══════════════════════════════════\n")
