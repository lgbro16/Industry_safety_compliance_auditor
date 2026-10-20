# Add this at the END of your step1_create_dataset.py
# After the dataset is generated and saved
# This adds activity_type and date columns automatically

import pandas as pd
import random
from datetime import datetime, timedelta

# Load the dataset you already created
df = pd.read_csv('data/safety_reports.csv')

# ── ACTIVITY TYPE ──────────────────────────────────────
# Define which activities go with SIF vs Non-SIF reports

sif_activities = [
    'Confined Space Entry',
    'Hot Work',
    'Work at Height',
    'Energy Isolation / LOTO',
    'Mechanical Lifting',
    'Ground Excavation',
    'Driving / Vehicle Operation',
]

non_sif_activities = [
    'Housekeeping',
    'Administrative',
    'Routine Inspection',
    'Store Management',
    'Documentation',
]

def assign_activity(row):
    if row['sif_label'] == 1:
        return random.choice(sif_activities)
    else:
        return random.choice(non_sif_activities)

df['activity_type'] = df.apply(assign_activity, axis=1)

# ── DATE ───────────────────────────────────────────────
# Spread dates from Jan 2024 to Aug 2024
# 8 months = 243 days total

base_date = datetime(2024, 1, 1)
total_days = 243  # Jan 1 to Aug 31

df['date'] = [
    (base_date + timedelta(days=random.randint(0, total_days))
    ).strftime('%Y-%m-%d')
    for _ in range(len(df))
]

# ── SAVE UPDATED CSV ───────────────────────────────────
df.to_csv('data/safety_reports.csv', index=False)

print("Columns added successfully!")
print(f"Total reports: {len(df)}")
print(f"\nActivity type distribution:")
print(df['activity_type'].value_counts())
print(f"\nDate range:")
print(f"  Earliest: {df['date'].min()}")
print(f"  Latest:   {df['date'].max()}")
print(f"\nFirst 5 rows preview:")
print(df[['report_id', 'sif_label', 'activity_type', 'date']].head())