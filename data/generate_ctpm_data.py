import random
import pandas as pd
from faker import Faker
from datetime import date, timedelta

fake = Faker('en_IN')
random.seed(42)
Faker.seed(42)

# Curated common Indian first and last names
male_first_names = [
    "Aarav", "Arjun", "Rohit", "Vikas", "Rahul", "Amit", "Sanjay", "Deepak",
    "Suresh", "Ramesh", "Nikhil", "Karan", "Aditya", "Manish", "Vikram",
    "Rajesh", "Sunil", "Pankaj", "Gaurav", "Ankit", "Hardik", "Varun",
    "Mohit", "Tarun", "Akash", "Rishi", "Yash", "Dev", "Harsh", "Kabir",
    "Pranav", "Ishaan", "Siddharth", "Naveen", "Manoj", "Dinesh", "Vinay",
    "Shubham", "Tushar", "Abhinav", "Rohan", "Sachin", "Lokesh", "Chetan",
]

female_first_names = [
    "Priya", "Ananya", "Pooja", "Sneha", "Neha", "Kavya", "Divya", "Anjali",
    "Shreya", "Riya", "Nisha", "Swati", "Meera", "Sana", "Deepa", "Sunita",
    "Rekha", "Geeta", "Usha", "Lata", "Asha", "Komal", "Simran", "Preeti",
    "Pallavi", "Shweta", "Tanvi", "Isha", "Aishwarya", "Kriti", "Mansi",
    "Nidhi", "Ritika", "Sakshi", "Sonal", "Tanya", "Vandana", "Vidya",
    "Yamini", "Bhavna", "Chhaya", "Falak", "Garima", "Harsha",
]

last_names = [
    "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Joshi", "Mehta", "Shah",
    "Verma", "Reddy", "Nair", "Iyer", "Pillai", "Rao", "Mishra", "Pandey",
    "Tiwari", "Shukla", "Dubey", "Chauhan", "Yadav", "Sinha", "Jain",
    "Agarwal", "Malhotra", "Kapoor", "Chopra", "Bose", "Das", "Mukherjee",
    "Banerjee", "Chatterjee", "Sen", "Ghosh", "Roy", "Desai", "Patil",
    "Kulkarni", "Naik", "Hegde", "Kaur", "Gill", "Bhatia", "Saxena",
]

# ─────────────────────────────────────────────
# MASTER / LOOKUP TABLES
# ─────────────────────────────────────────────

# --- DISEASE (35 rows) ---
disease_data = [
    ("Type 2 Diabetes Mellitus",     "E11"),
    ("Hypertension",                  "I10"),
    ("Chronic Kidney Disease",        "N18"),
    ("Breast Cancer",                 "C50"),
    ("Lung Cancer",                   "C34"),
    ("Colorectal Cancer",             "C18"),
    ("Alzheimer's Disease",           "G30"),
    ("Parkinson's Disease",           "G20"),
    ("Multiple Sclerosis",            "G35"),
    ("Rheumatoid Arthritis",          "M05"),
    ("Osteoporosis",                  "M81"),
    ("Asthma",                        "J45"),
    ("COPD",                          "J44"),
    ("Heart Failure",                 "I50"),
    ("Atrial Fibrillation",           "I48"),
    ("Coronary Artery Disease",       "I25"),
    ("Stroke",                        "I63"),
    ("HIV/AIDS",                      "B20"),
    ("Hepatitis B",                   "B18.1"),
    ("Hepatitis C",                   "B18.2"),
    ("Tuberculosis",                  "A15"),
    ("Systemic Lupus Erythematosus",  "M32"),
    ("Crohn's Disease",               "K50"),
    ("Ulcerative Colitis",            "K51"),
    ("Psoriasis",                     "L40"),
    ("Melanoma",                      "C43"),
    ("Prostate Cancer",               "C61"),
    ("Ovarian Cancer",                "C56"),
    ("Leukemia",                      "C91"),
    ("Lymphoma",                      "C85"),
    ("Obesity",                       "E66"),
    ("Hyperlipidemia",                "E78"),
    ("Depression",                    "F32"),
    ("Anxiety Disorder",              "F41"),
    ("Epilepsy",                      "G40"),
]

diseases = pd.DataFrame([
    {"DiseaseID": i+1, "DiseaseName": name, "ICDCode": code}
    for i, (name, code) in enumerate(disease_data)
])
disease_ids = diseases["DiseaseID"].tolist()

# --- LAB_TEST (15 rows) ---
lab_test_data = [
    ("Hemoglobin",              "g/dL",   "12.0-17.5"),
    ("Fasting Blood Glucose",   "mg/dL",  "70-100"),
    ("HbA1c",                   "%",      "4.0-5.6"),
    ("Serum Creatinine",        "mg/dL",  "0.6-1.2"),
    ("eGFR",                    "mL/min", "≥60"),
    ("Total Cholesterol",       "mg/dL",  "<200"),
    ("LDL Cholesterol",         "mg/dL",  "<100"),
    ("HDL Cholesterol",         "mg/dL",  ">40"),
    ("Triglycerides",           "mg/dL",  "<150"),
    ("ALT",                     "U/L",    "7-56"),
    ("AST",                     "U/L",    "10-40"),
    ("TSH",                     "mIU/L",  "0.4-4.0"),
    ("Platelet Count",          "10^3/uL","150-400"),
    ("WBC Count",               "10^3/uL","4.5-11.0"),
    ("PSA",                     "ng/mL",  "<4.0"),
]

lab_tests = pd.DataFrame([
    {"TestID": i+1, "TestName": name, "Unit": unit, "NormalRange": nr}
    for i, (name, unit, nr) in enumerate(lab_test_data)
])
test_ids = lab_tests["TestID"].tolist()

# --- MEDICATION (30 rows) ---
medication_data = [
    ("Metformin",       "Biguanide"),
    ("Insulin Glargine","Insulin"),
    ("Lisinopril",      "ACE Inhibitor"),
    ("Amlodipine",      "Calcium Channel Blocker"),
    ("Atorvastatin",    "Statin"),
    ("Rosuvastatin",    "Statin"),
    ("Aspirin",         "Antiplatelet"),
    ("Warfarin",        "Anticoagulant"),
    ("Apixaban",        "Anticoagulant"),
    ("Salbutamol",      "Beta-2 Agonist"),
    ("Fluticasone",     "Corticosteroid"),
    ("Prednisolone",    "Corticosteroid"),
    ("Methotrexate",    "DMARD"),
    ("Adalimumab",      "Biologic/TNF Inhibitor"),
    ("Rituximab",       "Monoclonal Antibody"),
    ("Trastuzumab",     "Monoclonal Antibody"),
    ("Tamoxifen",       "SERM"),
    ("Imatinib",        "Tyrosine Kinase Inhibitor"),
    ("Levodopa",        "Dopamine Precursor"),
    ("Donepezil",       "Cholinesterase Inhibitor"),
    ("Sertraline",      "SSRI"),
    ("Escitalopram",    "SSRI"),
    ("Losartan",        "ARB"),
    ("Furosemide",      "Loop Diuretic"),
    ("Omeprazole",      "PPI"),
    ("Levothyroxine",   "Thyroid Hormone"),
    ("Carbamazepine",   "Anticonvulsant"),
    ("Valproate",       "Anticonvulsant"),
    ("Tenofovir",       "Antiretroviral"),
    ("Rifampicin",      "Antibiotic"),
]

medications = pd.DataFrame([
    {"MedicationID": i+1, "DrugName": name, "DrugClass": cls}
    for i, (name, cls) in enumerate(medication_data)
])
med_ids = medications["MedicationID"].tolist()

# ─────────────────────────────────────────────
# PATIENT (500 rows)
# ─────────────────────────────────────────────
blood_groups = ['A+','A-','B+','B-','O+','O-','AB+','AB-']
genders      = ['M', 'F']

patients = []
for i in range(1, 501):
    gender     = random.choice(genders)
    first_name = random.choice(male_first_names if gender == 'M' else female_first_names)
    last_name  = random.choice(last_names)
    full_name  = f"{first_name} {last_name}"
    email      = f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 99)}@example.com"
    phone      = str(random.randint(6000000000, 9999999999))
    dob        = fake.date_of_birth(minimum_age=18, maximum_age=80)
    patients.append({
        "PatientID":   i,
        "Name":        full_name,
        "DateOfBirth": dob,
        "Gender":      gender,
        "Phone":       phone,
        "Email":       email,
        "City":        fake.city(),
        "Height":      round(random.uniform(150, 195), 1),
        "Weight":      round(random.uniform(45, 110), 1),
        "BloodGroup":  random.choice(blood_groups),
    })

patients_df = pd.DataFrame(patients)
patient_ids = patients_df["PatientID"].tolist()

# ─────────────────────────────────────────────
# CLINICAL_TRIAL (25 rows)
# ─────────────────────────────────────────────
trial_titles = [
    "METFORM-X: Metformin Efficacy in Early-Stage T2DM",
    "HYPER-CTRL: Lisinopril vs Losartan in Resistant Hypertension",
    "RENALGUARD: CKD Progression Delay with ARB Therapy",
    "BREAST-HOPE: Trastuzumab Adjuvant Therapy in HER2+ Breast Cancer",
    "LUNGSHIELD: Immunotherapy in Stage III NSCLC",
    "COLON-FIRST: Aspirin Chemoprevention in Colorectal Cancer",
    "ALZCARE-1: Donepezil Extended Release in Mild Alzheimer's",
    "PARKINSON-PLUS: Levodopa Dose Optimization Trial",
    "MS-REMIT: Rituximab in Relapsing-Remitting MS",
    "ARTHRO-BIO: Adalimumab vs Methotrexate in RA",
    "BONE-DENSITY: Bisphosphonate Trial in Postmenopausal Osteoporosis",
    "ASTHMA-CTRL: High-Dose Fluticasone in Severe Asthma",
    "COPD-BREATH: Salbutamol Nebulization Protocol in COPD",
    "HEARTFAIL-1: Furosemide Dosing in Decompensated Heart Failure",
    "AFIB-COAT: Apixaban vs Warfarin in Non-Valvular AF",
    "CAD-STATIN: Rosuvastatin Intensity in Stable CAD",
    "POST-STROKE: Aspirin + Clopidogrel in Ischemic Stroke Prevention",
    "HIV-ADVANCE: Tenofovir-Based Regimen Optimization",
    "HEPB-CLEAR: Antiviral Therapy in Chronic Hepatitis B",
    "TB-FAST: Short-Course Rifampicin Regimen in Pulmonary TB",
    "LUPUS-REMIT: Hydroxychloroquine in Active SLE",
    "CROHN-HEAL: Adalimumab Induction in Moderate Crohn's Disease",
    "MELANO-IMMUNE: Checkpoint Inhibitor in Stage IV Melanoma",
    "PROSTATE-WATCH: PSA-Guided Active Surveillance Protocol",
    "LEUKEMIA-PRIME: Imatinib in Newly Diagnosed CML",
]

sponsors = [
    "Pfizer Inc.", "Novartis AG", "Roche", "AstraZeneca",
    "Johnson & Johnson", "Merck & Co.", "Sanofi",
    "GlaxoSmithKline", "AIIMS New Delhi", "Tata Memorial Centre",
]

# map each trial to a logically relevant disease
trial_disease_map = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11,12,13,14,15,16,17,18,19,20,
    22,23,26,27,29
]

clinical_trials = []
for i, title in enumerate(trial_titles):
    start_date = fake.date_between(start_date='-3y', end_date='-6m')
    clinical_trials.append({
        "TrialID":        i+1,
        "TrialTitle":     title,
        "Phase":          random.choice(["I","II","III","IV"]),
        "Sponsor":        random.choice(sponsors),
        "TargetDisease":  trial_disease_map[i],
        "TrialStatus":    random.choice(["Open","Open","Open","Closed","Suspended"]),
        "MaxParticipants":random.choice([50,100,150,200,250,300]),
    })

trials_df = pd.DataFrame(clinical_trials)
trial_ids  = trials_df["TrialID"].tolist()

# ─────────────────────────────────────────────
# DIAGNOSIS (900 rows)
# ─────────────────────────────────────────────
diagnoses = []
for i in range(1, 901):
    diagnoses.append({
        "DiagnosisID":   i,
        "PatientID":     random.choice(patient_ids),
        "DiseaseID":     random.choice(disease_ids),
        "DiagnosisDate": fake.date_between(start_date='-10y', end_date='today'),
        "Severity":      random.choice(["Mild","Moderate","Severe"]),
        "Status":        random.choice(["Active","Active","Resolved"]),
    })

diagnosis_df = pd.DataFrame(diagnoses)

# ─────────────────────────────────────────────
# LAB_RESULT (1200 rows)
# ─────────────────────────────────────────────

# realistic value ranges per test
test_value_ranges = {
    1:  (8.0,  18.0),   # Hemoglobin
    2:  (60,   300),    # Fasting Blood Glucose
    3:  (4.0,  12.0),   # HbA1c
    4:  (0.4,  8.0),    # Serum Creatinine
    5:  (10,   120),    # eGFR
    6:  (120,  320),    # Total Cholesterol
    7:  (50,   220),    # LDL
    8:  (20,   90),     # HDL
    9:  (60,   400),    # Triglycerides
    10: (5,    120),    # ALT
    11: (5,    80),     # AST
    12: (0.1,  8.0),    # TSH
    13: (50,   600),    # Platelet Count
    14: (2.0,  20.0),   # WBC
    15: (0.1,  15.0),   # PSA
}

lab_results = []
for i in range(1, 1201):
    tid = random.choice(test_ids)
    lo, hi = test_value_ranges[tid]
    lab_results.append({
        "ResultID":  i,
        "PatientID": random.choice(patient_ids),
        "TestID":    tid,
        "TestValue": round(random.uniform(lo, hi), 2),
        "TestDate":  fake.date_between(start_date='-5y', end_date='today'),
    })

lab_results_df = pd.DataFrame(lab_results)

# ─────────────────────────────────────────────
# PATIENT_MEDICATION (750 rows)
# ─────────────────────────────────────────────
patient_meds = []
for i in range(1, 751):
    start = fake.date_between(start_date='-5y', end_date='-1m')
    # ~40% still ongoing
    if random.random() < 0.4:
        end    = None
        status = "Active"
    else:
        end    = fake.date_between(start_date=start + timedelta(days=1), end_date='today')
        status = random.choice(["Completed", "Discontinued"])

    patient_meds.append({
        "PatientMedID":  i,
        "PatientID":     random.choice(patient_ids),
        "MedicationID":  random.choice(med_ids),
        "Dosage":        f"{random.choice([5,10,20,25,50,100,250,500,1000])}mg",
        "StartDate":     start,
        "EndDate":       end,
        "CurrentStatus": status,
    })

patient_meds_df = pd.DataFrame(patient_meds)

# ─────────────────────────────────────────────
# ELIGIBILITY_CRITERIA (60 rows — ~2-3 per trial)
# ─────────────────────────────────────────────
criteria_rows = []
cid = 1
for tid in trial_ids:
    target_disease = trials_df.loc[trials_df["TrialID"] == tid, "TargetDisease"].values[0]
    num_criteria   = random.randint(2, 3)

    for j in range(num_criteria):
        ctype = "Inclusion" if j == 0 else random.choice(["Inclusion","Exclusion"])
        criteria_rows.append({
            "CriteriaID":            cid,
            "TrialID":               tid,
            "CriteriaType":          ctype,
            "AgeMin":                random.choice([18, 21, 25, 30]),
            "AgeMax":                random.choice([60, 65, 70, 75, 80]),
            "RequiredDisease":       target_disease,
            "LabThreshold":          f"HbA1c > {round(random.uniform(6.5,9.0),1)}" if random.random() > 0.5 else None,
            "MedicationRestriction": random.choice([None, None, "No Warfarin", "No Steroids", "No Immunosuppressants"]),
            "BiomarkerRequirement":  random.choice([None, None, "HER2+", "EGFR Mutation", "BCR-ABL positive"]),
        })
        cid += 1

eligibility_df = pd.DataFrame(criteria_rows)

# ─────────────────────────────────────────────
# PATIENT_TRIAL_MATCH (400 rows)
# ─────────────────────────────────────────────

# generate unique (PatientID, TrialID) pairs
match_pairs = set()
while len(match_pairs) < 400:
    match_pairs.add((random.choice(patient_ids), random.choice(trial_ids)))

patient_trial_matches = []
for mid, (pid, tid) in enumerate(match_pairs, start=1):
    patient_trial_matches.append({
        "MatchID":          mid,
        "PatientID":        pid,
        "TrialID":          tid,
        "EligibilityStatus":random.choice(["Eligible","Eligible","Not Eligible"]),
        "MatchScore":       round(random.uniform(0, 100), 1),
    })

match_df = pd.DataFrame(patient_trial_matches)

# ─────────────────────────────────────────────
# ENROLLMENT (200 rows — subset of match pairs)
# ─────────────────────────────────────────────

# only enroll from eligible matches
eligible_matches = match_df[match_df["EligibilityStatus"] == "Eligible"][["PatientID","TrialID"]]
sampled          = eligible_matches.sample(n=min(200, len(eligible_matches)), random_state=42)

enrollments = []
for eid, (_, row) in enumerate(sampled.iterrows(), start=1):
    consent_date = fake.date_between(start_date='-2y', end_date='today')
    enrollments.append({
        "EnrollmentID":    eid,
        "PatientID":       row["PatientID"],
        "TrialID":         row["TrialID"],
        "ConsentStatus":   random.choice(["Given","Given","Given","Withdrawn"]),
        "ConsentDate":     consent_date,
        "EnrollmentStatus":random.choice(["Enrolled","Enrolled","Screening","Completed","Withdrawn","Rejected"]),
    })

enrollment_df = pd.DataFrame(enrollments)

# ─────────────────────────────────────────────
# EXPORT TO CSV
# ─────────────────────────────────────────────
output = {
    "patients":          patients_df,
    "diseases":          diseases,
    "lab_tests":         lab_tests,
    "medications":       medications,
    "clinical_trials":   trials_df,
    "diagnoses":         diagnosis_df,
    "lab_results":       lab_results_df,
    "patient_meds":      patient_meds_df,
    "eligibility":       eligibility_df,
    "patient_trial_match": match_df,
    "enrollment":        enrollment_df,
}

for name, df in output.items():
    path = f"/home/claude/{name}.csv"
    df.to_csv(path, index=False)
    print(f"✅ {name:25s} → {len(df):>5} rows  →  {path}")

print("\nAll CSVs generated successfully.")
