# step4_rule_tagger.py

import re

# ── 10 IOGP LIFE-SAVING RULES ──────────────────────────
# These are the ACTUAL industry standard rules
# Published by International Association of
# Oil and Gas Producers (IOGP)
# Your tagger maps each report to these rules

LIFE_SAVING_RULES = {

    "Confined Space Entry": {
        "keywords": [
            "confined space", "tank entry", "vessel entry",
            "manhole", "underground", "sump", "pit",
            "atmospheric testing", "gas test",
            "hydrogen sulfide", "h2s", "oxygen deficient",
            "standby person", "rescue plan",
            "permit to enter", "toxic atmosphere" , "sour crude",
            "scba", "bleed valve", "breathing apparatus", "gas detector" 
        ],
        "intervention": "Suspend all confined space entries. Verify atmospheric testing protocol immediately."
    },

    "Energy Isolation": {
        "keywords": [
            "loto", "lockout", "tagout",
            "isolation", "isolate", "not isolated",
            "energized", "live wire", "live equipment",
            "bypass", "bypassed", "override",
            "interlock", "safety device disabled",
            "de-energize", "pressure release"
        ],
        "intervention": "Stop all maintenance work. Audit LOTO compliance across all worksites."
    },

    "Hot Work": {
        "keywords": [
            "hot work", "welding", "cutting",
            "grinding", "spark", "flame",
            "ignition", "brazing", "soldering",
            "angle grinder", "flammable area",
            "fire watch", "fire extinguisher",
            "gas cutting", "without permit"
        ],
        "intervention": "Review hot work permit system. Conduct immediate fire risk assessment."
    },

    "Line of Fire": {
        "keywords": [
            "struck by", "hit by", "moving vehicle",
            "vehicle", "truck", "crane",
            "swinging load", "lifted load",
            "reverse", "banksman", "blind spot",
            "pedestrian", "line of fire",
            "trajectory", "projectile", "ejected" ,
            "winch", "reversing", "blind spot", "spotter", "banksman"
        ],
        "intervention": "Review traffic management plan. Enforce strict pedestrian segregation."
    },

    "Work at Height": {
        "keywords": [
            "height", "fall", "harness",
            "scaffolding", "elevated", "roof",
            "ladder", "aerial work platform",
            "fall arrest", "without harness",
            "unprotected edge", "leading edge",
            "opening", "skylight", "meter height"
        ],
        "intervention": "Inspect all fall protection equipment. Stop work at height without harness."
    },

    "Driving": {
        "keywords": [
            "driving", "speeding", "seatbelt",
            "seat belt", "fatigue driving",
            "mobile phone driving", "journey management",
            "road accident", "vehicle accident",
            "collision", "speed limit", "driver"
        ],
        "intervention": "Review journey management plan. Check driver fatigue records."
    },

    "Ground Disturbance": {
        "keywords": [
            "excavation", "digging", "ground disturbance",
            "underground pipe", "buried cable",
            "utility", "trench", "pipe strike",
            "cable strike", "ground survey",
            "drawing not checked", "soil"
        ],
        "intervention": "Halt all excavation. Verify underground utility survey before resuming."
    },

    "Bypassing Safety Controls": {
        "keywords": [
            "bypass", "bypassed", "override",
            "disabled", "removed", "safety device",
            "guard removed", "interlock disabled",
            "alarm suppressed", "defeated",
            "tampered", "deactivated", "switched off",
            "interlock", "esd", "shutdown valve", "strainer"
        ],
        "intervention": "Immediate safety audit. Restore all bypassed controls before resuming work."
    },

    "Mechanical Lifting": {
        "keywords": [
            "lifting", "crane", "rigging",
            "sling", "hook", "load chart",
            "lifting plan", "overhead lift",
            "suspended load", "rigging inspection",
            "rated capacity", "overload",
            "below suspended load"
        ],
        "intervention": "Review lifting plans and rigging inspection records immediately."
    },

    "Management of Change": {
        "keywords": [
            "modification", "change", "moc",
            "management of change", "unauthorized change",
            "design change", "procedure change",
            "not communicated", "not informed",
            "without approval", "undocumented"
        ],
        "intervention": "Freeze all unauthorized modifications. Initiate MOC review process."
    },
}


# ── CORE TAGGING FUNCTION ──────────────────────────────

def tag_life_saving_rules(report_text):
    """
    Input : one report text (string)
    Output: list of matched rules with details

    Each matched rule contains:
    → rule name
    → confidence score (%)
    → which keywords matched
    → recommended intervention
    """

    text_lower = report_text.lower()
    matched_rules = []

    for rule_name, rule_data in LIFE_SAVING_RULES.items():
        keywords     = rule_data['keywords']
        intervention = rule_data['intervention']

        # Find which keywords matched
        matched_kws = [
            kw for kw in keywords
            if kw in text_lower
        ]

        if matched_kws:
            # Confidence = matched / 3 (cap at 100%)
            # Needs 3+ keywords for full confidence
            confidence = min(
                len(matched_kws) / 3.0 * 100,
                100.0
            )

            matched_rules.append({
                'rule'          : rule_name,
                'confidence'    : round(confidence, 1),
                'matched_kws'   : matched_kws,
                'intervention'  : intervention
            })

    # Sort: highest confidence first
    matched_rules.sort(
        key=lambda x: x['confidence'],
        reverse=True
    )

    # If nothing matched
    if not matched_rules:
        matched_rules = [{
            'rule'        : 'General Safety Observation',
            'confidence'  : 30.0,
            'matched_kws' : [],
            'intervention': 'Log and monitor. Review in next safety meeting.'
        }]

    return matched_rules


# ── PRECURSOR EXTRACTOR ────────────────────────────────

def extract_precursors(report_text):
    """
    Extracts what went wrong in THREE categories:
    1. Activity  → what was being done
    2. Location  → where it happened
    3. Barrier   → what protection was missing
    """

    text_lower = report_text.lower()

    precursors = {
        'activity'       : [],
        'location'       : [],
        'barrier_failure': [],
    }

    # ── Activities ──
    activity_map = {
        'Hot Work'              : ['welding','cutting','grinding','hot work','brazing'],
        'Confined Space Entry'  : ['confined space','tank entry','vessel entry','manhole'],
        'Maintenance'           : ['maintenance','repair','servicing','overhaul'],
        'Mechanical Lifting'    : ['lifting','crane operation','rigging','hoisting'],
        'Driving'               : ['driving','vehicle operation','transport'],
        'Excavation'            : ['excavation','digging','trenching'],
        'Electrical Work'       : ['electrical','wiring','switchgear','panel'],
        'Work at Height'        : ['height work','scaffolding','roof work','ladder'],
    }

    # ── Locations ──
    location_map = {
        'Tank Farm'             : ['tank farm','storage tank','tank area'],
        'Drilling Rig'          : ['drilling rig','rig floor','drill site'],
        'Pump Station'          : ['pump station','pumping station'],
        'Pipeline'              : ['pipeline','pipe','flowline'],
        'Well Site'             : ['well site','wellhead'],
        'Compressor Station'    : ['compressor','compression station'],
        'Processing Plant'      : ['processing plant','production facility'],
        'Workshop'              : ['workshop','fabrication shop','maintenance bay'],
        'Confined Space'        : ['confined space','vessel interior','tank interior'],
    }

    # ── Barrier Failures ──
    barrier_map = {
        'No Permit to Work'     : ['no permit','without permit','permit not issued','ptw not'],
        'No Energy Isolation'   : ['not isolated','no isolation','loto not done','not de-energized'],
        'No PPE'                : ['no ppe','without ppe','no helmet','no harness','ppe not worn'],
        'No Gas Testing'        : ['no gas test','gas not tested','atmospheric not checked'],
        'No Standby Person'     : ['no standby','standby not present','standby absent'],
        'Procedure Not Followed': ['not followed','procedure ignored','sop not followed'],
        'No Supervision'        : ['no supervisor','unsupervised','supervisor absent'],
        'Safety Device Bypassed': ['bypassed','disabled','removed','overridden','defeated'],
        'No PPE'                : ['no ppe', 'without ppe', 'no helmet', 'no harness', 'no scba', 'without scba', 'no gas detector'],
        'No Supervision'        : ['no supervisor', 'unsupervised', 'supervisor absent', 'no spotter', 'no banksman', 'without spotter'],
    }

    for name, keywords in activity_map.items():
        if any(kw in text_lower for kw in keywords):
            precursors['activity'].append(name)

    for name, keywords in location_map.items():
        if any(kw in text_lower for kw in keywords):
            precursors['location'].append(name)

    for name, keywords in barrier_map.items():
        if any(kw in text_lower for kw in keywords):
            precursors['barrier_failure'].append(name)

    return precursors


# ── QUICK TEST ─────────────────────────────────────────

if __name__ == "__main__":

    test_reports = [

        {
            "label": "SIF Report",
            "text" : """Worker entered storage tank without 
                        atmospheric testing. H2S level found 
                        at 15 ppm. No standby person present. 
                        PTW not obtained. Gas monitor not 
                        available with worker."""
        },

        {
            "label": "Non-SIF Report",
            "text" : """Housekeeping not maintained near 
                        canteen area. Waste bins overflowing. 
                        Minor slip hazard near entrance."""
        },

        {
            "label": "SIF Report 2",
            "text" : """Hot work was carried out near fuel 
                        storage area without valid permit. 
                        Fire extinguisher was absent. 
                        Flammable containers observed within 
                        3 meters of welding activity."""
        }
    ]

    for report in test_reports:

        print("\n" + "="*60)
        print(f"TESTING: {report['label']}")
        print("="*60)
        print(f"Text: {report['text'][:100].strip()}...")

        # Tag rules
        rules = tag_life_saving_rules(report['text'])
        print(f"\nLife-Saving Rules Triggered ({len(rules)} found):")
        for rule in rules:
            print(f"  → {rule['rule']:<30} "
                  f"Confidence: {rule['confidence']}%")
            print(f"     Keywords: {', '.join(rule['matched_kws'])}")
            print(f"     Action  : {rule['intervention'][:60]}...")

        # Extract precursors
        precursors = extract_precursors(report['text'])
        print(f"\nPrecursors Extracted:")
        for category, items in precursors.items():
            if items:
                print(f"  {category:<20}: {', '.join(items)}")

    print("\n" + "="*60)
    print("Step 4 (Rule Tagger) Complete")
    print("Next: python step5_predict.py")
    print("="*60)