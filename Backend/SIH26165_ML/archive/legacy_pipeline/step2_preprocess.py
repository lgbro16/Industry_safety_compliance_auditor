# step2_preprocess.py

import pandas as pd
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# ── SAFETY ABBREVIATION EXPANDER ───────────────────────
# This is YOUR domain-specific innovation
# Generic NLP tools don't know these abbreviations

safety_abbreviations = {
    'ua'     : 'unsafe act',
    'uc'     : 'unsafe condition',
    'ptw'    : 'permit to work',
    'loto'   : 'lockout tagout energy isolation',
    'ppe'    : 'personal protective equipment',
    'h2s'    : 'hydrogen sulfide toxic gas',
    'lel'    : 'lower explosive limit flammable',
    'sif'    : 'serious injury fatality',
    'jsa'    : 'job safety analysis',
    'tbm'    : 'toolbox meeting',
    'nm'     : 'near miss',
    'moc'    : 'management of change',
    'hsse'   : 'health safety security environment',
    'msds'   : 'material safety data sheet',
    'awp'    : 'aerial work platform',
}

def expand_abbreviations(text):
    text = text.lower()
    for short, full in safety_abbreviations.items():
        # \b means word boundary
        # prevents "loto" matching inside "piloto"
        text = re.sub(r'\b' + short + r'\b', full, text)
    return text


# ── STOPWORDS SETUP ────────────────────────────────────
# Remove common English stopwords
# BUT preserve safety-critical negation words

standard_stopwords = set(stopwords.words('english'))

# These words MUST be kept in safety reports
safety_preserve = {
    'not', 'no', 'without', 'never', 'none',
    'absent', 'missing', 'failed', 'bypassed',
    'ignored', 'disabled', 'removed', 'above',
    'below', 'near', 'against'
}

# Final stopwords = standard minus safety words
final_stopwords = standard_stopwords - safety_preserve


# ── MAIN PREPROCESSING FUNCTION ────────────────────────

lemmatizer = WordNetLemmatizer()

def preprocess(text):
    """
    Full preprocessing pipeline for one report.
    Input : raw report string
    Output: cleaned processed string
    """

    # Stage 1: Expand safety abbreviations
    text = expand_abbreviations(text)

    # Stage 2: Remove special characters
    # Keep only letters and spaces
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)

    # Stage 3: Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()

    # Stage 4: Tokenize (split into word list)
    tokens = word_tokenize(text)

    # Stage 5: Remove stopwords (keeping safety words)
    tokens = [
        word for word in tokens
        if word not in final_stopwords
    ]

    # Stage 6: Lemmatize (reduce to base form)
    tokens = [lemmatizer.lemmatize(word) for word in tokens]

    # Stage 7: Join back to single string
    processed = ' '.join(tokens)

    return processed


# ── APPLY TO FULL DATASET ──────────────────────────────

def run_preprocessing():

    print("Loading dataset...")
    df = pd.read_csv('data/safety_reports.csv')
    print(f"Loaded {len(df)} reports")

    print("\nRunning preprocessing...")
    df['processed_text'] = df['report_text'].apply(preprocess)

    # Save updated dataset
    df.to_csv('data/safety_reports.csv', index=False)
    print("Saved! Column 'processed_text' added to CSV.")

    # Show before and after for first 3 reports
    print("\n" + "="*60)
    print("BEFORE vs AFTER PREPROCESSING")
    print("="*60)

    for i in range(3):
        print(f"\nReport {i+1} (Label: {df['sif_label'][i]}):")
        print(f"BEFORE: {df['report_text'][i][:120]}...")
        print(f"AFTER : {df['processed_text'][i][:120]}...")
        print("-"*60)

    # Quick check: are safety words preserved?
    print("\nSAFETY WORD PRESERVATION CHECK:")
    check_words = ['not', 'without', 'no', 'absent', 'bypassed']
    
    for word in check_words:
        count = df['processed_text'].str.contains(
            r'\b' + word + r'\b', regex=True
        ).sum()
        print(f"  '{word}' preserved in {count} reports ✓")

    return df


# ── RUN ────────────────────────────────────────────────
if __name__ == "__main__":
    df = run_preprocessing()
    print("\nStep 2 Complete. Ready for Step 3.")