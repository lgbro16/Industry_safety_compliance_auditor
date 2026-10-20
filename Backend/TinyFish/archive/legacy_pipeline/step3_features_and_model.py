# step3_features_and_model.py

import os
import pandas as pd
import numpy as np
import joblib
from scipy.sparse import hstack, csr_matrix

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    recall_score,
    f1_score
)

# ── LOAD DATASET ───────────────────────────────────────

print("Loading dataset...")
df = pd.read_csv('data/safety_reports.csv')
print(f"Total reports loaded: {len(df)}")
print(f"SIF reports    (label=1): {df['sif_label'].sum()}")
print(f"Non-SIF reports(label=0): {(df['sif_label']==0).sum()}")

# ── PART A: TF-IDF VECTORIZATION ──────────────────────
#
# What TF-IDF does:
# Converts each report (text) into a row of numbers
#
# TF  = how often a word appears in THIS report
# IDF = how rare the word is across ALL reports
#
# High score = word is important AND unique to this report
#
# Example result:
# "confined space" → 0.82 in report 3 (SIF)
# "confined space" → 0.00 in report 7 (Non-SIF)
# This difference helps the model learn

print("\n" + "="*60)
print("STEP 3A: TF-IDF FEATURE EXTRACTION")
print("="*60)

tfidf_vectorizer = TfidfVectorizer(
    max_features = 200,
    # Top 200 words/phrases only
    # Enough for 50 reports, not too many

    ngram_range  = (1, 3),
    # Captures:
    # 1-word : "harness", "isolated", "permit"
    # 2-words: "confined space", "hot work"
    # 3-words: "not properly isolated", "no standby person"

    min_df       = 2,
    # Word must appear in at least 2 reports
    # Removes very rare typos or one-off words

    max_df       = 0.90,
    # Ignore words appearing in 90%+ reports
    # These are too common to be useful

    sublinear_tf = True,
    # Apply log to term frequency
    # Prevents very frequent words from dominating
)

# Fit on training text and transform all reports
X_tfidf = tfidf_vectorizer.fit_transform(df['processed_text'])

print(f"TF-IDF Matrix Shape: {X_tfidf.shape}")
print(f"  Rows    = {X_tfidf.shape[0]} reports")
print(f"  Columns = {X_tfidf.shape[1]} word features")

# Show top features extracted
feature_names = tfidf_vectorizer.get_feature_names_out()
print(f"\nSample features extracted (first 20):")
print(list(feature_names[:20]))

# ── PART B: DOMAIN KEYWORD FEATURES ───────────────────
#
# TF-IDF learns from data patterns.
# But our data is small (50 reports).
# So we MANUALLY add safety domain knowledge.
#
# For each report, we check:
# Does it mention energy-related words? → 1 or 0
# Does it mention height-related words? → 1 or 0
# Does it mention barrier failure words?→ 1 or 0
# etc.
#
# This is YOUR innovation on top of standard TF-IDF.

print("\n" + "="*60)
print("STEP 3B: DOMAIN KEYWORD FEATURES")
print("="*60)

sif_keyword_categories = {

    'energy_keywords': [
        'loto', 'lockout', 'tagout', 'isolation',
        'energized', 'not isolated', 'bypass',
        'bypassed', 'live wire', 'override'
    ],

    'height_keywords': [
        'height', 'fall', 'harness', 'scaffolding',
        'elevated', 'roof', 'ladder',
        'fall arrest', 'without harness', 'aerial'
    ],

    'confined_keywords': [
        'confined space', 'tank entry', 'vessel entry',
        'gas test', 'atmospheric', 'standby',
        'rescue plan', 'hydrogen sulfide', 'oxygen'
    ],

    'hotwork_keywords': [
        'hot work', 'welding', 'grinding', 'cutting',
        'spark', 'flame', 'flammable',
        'permit expired', 'no permit', 'without permit'
    ],

    'lineoffire_keywords': [
        'struck by', 'hit by', 'vehicle', 'moving load',
        'crane', 'lifted load', 'banksman',
        'reverse', 'blind spot', 'pedestrian'
    ],

    'barrier_failure_keywords': [
        'not done', 'not followed', 'absent', 'missing',
        'bypassed', 'ignored', 'not available',
        'not present', 'without', 'no permit',
        'no harness', 'no gas', 'no standby'
    ],

    'fatal_signal_keywords': [
        'fatal', 'fatality', 'death', 'serious injury',
        'critical', 'life threatening',
        'potential fatality', 'could have killed',
        'major injury', 'high consequence'
    ],
}

def extract_keyword_features(text):
    """
    For one report text:
    Returns list of numbers based on keyword presence.

    For each category:
    → Feature 1: Is ANY keyword present? (0 or 1)
    → Feature 2: How MANY keywords present? (count)

    Total features = 7 categories × 2 = 14 numbers
    """
    text_lower = str(text).lower()
    features = []

    for category, keywords in sif_keyword_categories.items():
        # Binary: at least one keyword present?
        any_present = int(
            any(kw in text_lower for kw in keywords)
        )
        # Count: how many keywords present?
        count_present = sum(
            1 for kw in keywords if kw in text_lower
        )
        features.append(any_present)
        features.append(count_present)

    return features

# Apply to all reports
print("Extracting keyword features for all reports...")

keyword_features = np.array([
    extract_keyword_features(text)
    for text in df['report_text']
    # Use original text here, not processed
    # Because processed text may lose some phrases
])

print(f"Keyword Feature Matrix Shape: {keyword_features.shape}")
print(f"  Rows    = {keyword_features.shape[0]} reports")
print(f"  Columns = {keyword_features.shape[1]} keyword features")
print(f"  (7 categories x 2 features each = 14 features)")


# ── PART C: COMBINE BOTH FEATURE SETS ─────────────────
#
# Final feature vector for each report =
# TF-IDF features (200) + Keyword features (14)
# = 214 total features per report
#
# More features = richer representation = better model

print("\n" + "="*60)
print("STEP 3C: COMBINING FEATURES")
print("="*60)

# Convert keyword array to sparse matrix
# (TF-IDF is already sparse, need to match format)
keyword_sparse = csr_matrix(keyword_features)

# Stack horizontally: side by side
X_combined = hstack([X_tfidf, keyword_sparse])

print(f"TF-IDF features:   {X_tfidf.shape[1]}")
print(f"Keyword features:  {keyword_sparse.shape[1]}")
print(f"Combined features: {X_combined.shape[1]}")
print(f"Final matrix shape: {X_combined.shape}")

# Labels
y = df['sif_label'].values
print(f"\nLabels shape: {y.shape}")
print(f"Label distribution: {dict(zip(*np.unique(y, return_counts=True)))}")


# ── PART D: TRAIN TEST SPLIT ───────────────────────────
#
# We cannot train and test on same data.
# Model would just memorize answers.
# We need unseen data to test real performance.
#
# Split:
# 80% = 40 reports for training (model learns from these)
# 20% = 10 reports for testing  (model never sees these)

print("\n" + "="*60)
print("STEP 4A: TRAIN TEST SPLIT")
print("="*60)

X_train, X_test, y_train, y_test = train_test_split(
    X_combined,
    y,
    test_size    = 0.2,
    random_state = 42,
    stratify     = y
    # stratify ensures both splits have
    # same ratio of SIF vs Non-SIF
    # prevents all SIF going to one split
)

print(f"Training set: {X_train.shape[0]} reports")
print(f"Testing set:  {X_test.shape[0]} reports")
print(f"Train labels: SIF={y_train.sum()} | Non-SIF={(y_train==0).sum()}")
print(f"Test  labels: SIF={y_test.sum()}  | Non-SIF={(y_test==0).sum()}")


# ── PART E: TRAIN RANDOM FOREST ───────────────────────
#
# Random Forest = many decision trees voting together
#
# Each tree asks questions like:
# "Does report contain 'confined space'? → YES → go left"
# "Does report contain 'housekeeping'?   → YES → Non-SIF"
#
# 100 trees vote → majority wins
# This reduces errors from any single tree

print("\n" + "="*60)
print("STEP 4B: TRAINING RANDOM FOREST MODEL")
print("="*60)

rf_model = RandomForestClassifier(
    n_estimators  = 100,
    # 100 decision trees
    # More trees = more stable predictions

    max_depth     = 8,
    # Each tree can ask max 8 questions deep
    # Prevents overfitting on small dataset

    random_state  = 42,
    # Fixed seed = reproducible results
    # Running again gives same output

    class_weight  = 'balanced',
    # Handles imbalance between SIF and Non-SIF
    # Gives more importance to minority class

    n_jobs        = -1,
    # Use all available CPU cores
    # Makes training faster
)

print("Training model... (this takes a few seconds)")
rf_model.fit(X_train, y_train)
print("Training complete!")


# ── PART F: EVALUATE MODEL ─────────────────────────────
#
# METRICS EXPLAINED FOR SAFETY DOMAIN:
#
# Accuracy  = overall correct predictions
# Precision = of all reports flagged SIF,
#             how many truly are SIF?
# Recall    = of all actual SIF reports,
#             how many did we catch?
# F1        = balance of precision and recall
# AUC-ROC   = overall discrimination ability
#
# FOR SAFETY: RECALL IS MOST IMPORTANT
# Missing a SIF = potential fatality
# False alarm   = extra caution (acceptable)

print("\n" + "="*60)
print("STEP 4C: MODEL EVALUATION")
print("="*60)

# Get predictions
y_pred      = rf_model.predict(X_test)
y_prob      = rf_model.predict_proba(X_test)[:, 1]

# Calculate metrics
accuracy    = accuracy_score(y_test, y_pred)
recall      = recall_score(y_test, y_pred, zero_division=0)
f1          = f1_score(y_test, y_pred, zero_division=0)
auc         = roc_auc_score(y_test, y_prob)

# Confusion matrix
cm          = confusion_matrix(y_test, y_pred)

print(f"\nCONFUSION MATRIX:")
print(f"  True Negative  (Non-SIF correct) : {cm[0][0]}")
print(f"  False Positive (Non-SIF -> SIF)  : {cm[0][1]}")
print(f"  False Negative (SIF MISSED [!] ) : {cm[1][0]}")
print(f"  True Positive  (SIF correct)     : {cm[1][1]}")

print(f"\nKEY METRICS:")
print(f"  Accuracy  : {accuracy:.3f} ({accuracy*100:.1f}%)")
print(f"  Recall    : {recall:.3f}   ({recall*100:.1f}%) <- MOST IMPORTANT")
print(f"  F1 Score  : {f1:.3f}   ({f1*100:.1f}%)")
print(f"  AUC-ROC   : {auc:.3f}   ({auc*100:.1f}%)")

print(f"\nDETAILED CLASSIFICATION REPORT:")
print(classification_report(
    y_test, y_pred,
    target_names=['Non-SIF', 'SIF-Potential'],
    zero_division=0
))

# Targets check
print("TARGET CHECK:")
print(f"  Recall > 80% : {'[PASS]' if recall > 0.80 else '[WARN] Below target'}")
print(f"  F1     > 70% : {'[PASS]' if f1     > 0.70 else '[WARN] Below target'}")
print(f"  AUC    > 75% : {'[PASS]' if auc    > 0.75 else '[WARN] Below target'}")


# ── PART G: FEATURE IMPORTANCE ─────────────────────────
#
# Random Forest tells us which words/features
# were most useful in making decisions.
#
# This is VERY useful for judges:
# "The model learned that 'confined space',
#  'not isolated', 'without permit' are the
#  strongest predictors of SIF potential"
#
# Shows the model is learning REAL safety patterns
# Not random noise

print("\n" + "="*60)
print("STEP 4D: TOP PREDICTIVE FEATURES")
print("="*60)

# Get importance scores
importances   = rf_model.feature_importances_

# Get all feature names
tfidf_names   = list(tfidf_vectorizer.get_feature_names_out())
keyword_names = []
for cat in sif_keyword_categories.keys():
    keyword_names.append(cat + '_present')
    keyword_names.append(cat + '_count')

all_names = tfidf_names + keyword_names

# Build importance dataframe
importance_df = pd.DataFrame({
    'feature'    : all_names[:len(importances)],
    'importance' : importances
}).sort_values('importance', ascending=False)

print("TOP 15 FEATURES PREDICTING SIF POTENTIAL:")
print("-"*50)
for i, row in importance_df.head(15).iterrows():
    bar = "#" * int(row['importance'] * 2000)
    print(f"  {row['feature']:<35} {bar}")

print("\n(Longer bar = stronger predictor of SIF)")

# ── PART H: SAVE MODELS ────────────────────────────────

print("\n" + "="*60)
print("STEP 4E: SAVING MODELS")
print("="*60)

os.makedirs('models', exist_ok=True)

joblib.dump(rf_model,         'models/sif_classifier.pkl')
joblib.dump(tfidf_vectorizer, 'models/tfidf_vectorizer.pkl')

print("Saved: models/sif_classifier.pkl")
print("Saved: models/tfidf_vectorizer.pkl")
print("\nThese files contain your trained model.")
print("Step 5 will load these to predict new reports.")

print("\n" + "="*60)
print("STEP 3 + STEP 4 COMPLETE")
print("="*60)
print("Next: step4_rule_tagger.py")
print("      step5_predict.py")