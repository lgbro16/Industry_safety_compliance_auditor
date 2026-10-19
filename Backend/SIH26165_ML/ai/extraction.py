"""
extraction.py - Structured Information & Precursor Extraction Engine
Extracts operational activities, equipment, locations, hazards, barrier breaches,
and potential consequences deterministically from raw field narratives.
"""

import re
from typing import Dict, List, Any


# ── DOMAIN VOCABULARIES & PATTERNS ──────────────────────

ACTIVITIES = [
    ("Sludge removal", [r"sludge\s+removal", r"desludging", r"sludge\s+cleaning", r"tank\s+cleaning"]),
    ("Confined Space Entry", [r"confined\s+space", r"tank\s+entry", r"vessel\s+entry", r"entered\s+(?:the\s+)?(?:tank|vessel|separator|manhole|pit|sump)", r"internal\s+inspection"]),
    ("Hot Work", [r"hot\s+work", r"welding", r"grinding", r"cutting", r"brazing", r"torch"]),
    ("Energy Isolation / LOTO", [r"loto", r"lockout", r"tagout", r"isolation", r"breaker\s+tagged", r"de-energiz"]),
    ("Mechanical Lifting", [r"crane\s+lift", r"hoist", r"rigging", r"suspended\s+load", r"sling", r"wire\s+rope"]),
    ("Drilling Operations", [r"drill\s+pipe", r"rotary\s+table", r"top\s+drive", r"tripping", r"roughneck", r"derrick"]),
    ("Work at Height", [r"work(?:ing)?\s+at\s+height", r"scaffold", r"monkey\s+board", r"ladder", r"elevation"]),
    ("Line Breaching", [r"line\s+breach", r"flange\s+crack", r"unbolted\s+the\s+casing", r"breaking\s+(?:the\s+)?coupling", r"opening\s+a\s+.*flange"]),
    ("Excavation & Ground Disturbance", [r"excavat", r"trench", r"digging", r"ground\s+disturbance"]),
    ("Driving / Logistics", [r"driving", r"vehicle", r"truck", r"reversing", r"transport"]),
    ("Maintenance & Inspection", [r"maintenance", r"overhaul", r"inspection", r"servicing", r"repair"]),
    ("Housekeeping", [r"housekeeping", r"waste\s+bin", r"spill", r"oily\s+rag", r"wet\s+floor"]),
]

LOCATIONS = [
    ("Pump Station 4", [r"pump\s+station\s+4", r"ps-?4"]),
    ("Pump Station 2", [r"pump\s+station\s+2", r"ps-?2"]),
    ("Tank Farm B", [r"tank\s+farm\s+b", r"tk\s+farm\s+b"]),
    ("Drilling Rig 8", [r"drilling\s+rig\s+8", r"rig\s+8", r"rig\s+#?8"]),
    ("Duliajan Drilling Complex", [r"duliajan\s+(?:drilling\s+)?(?:rig\s+#?4|complex)"]),
    ("Moran Central Tank Farm", [r"moran\s+(?:central\s+)?tank\s+farm", r"moran\s+hub"]),
    ("Digboi Feeder Line 9", [r"digboi\s+(?:feeder\s+)?line\s+9"]),
    ("Nahorkatiya Station", [r"nahorkatiya", r"compressor\s+station\s+1"]),
    ("Flowstation 3 - Makum", [r"flowstation\s+3", r"makum"]),
    ("Well Pad 04", [r"well\s+pad\s+0?4"]),
    ("Well Pad 11", [r"well\s+pad\s+11"]),
    ("Pipeline ROW", [r"pipeline\s+row", r"row\s+km"]),
]

EQUIPMENT_PATTERNS = [
    (r"(?:separator\s+vessel\s+v-?\d+|separator\s+v-?\d+|v-102|v-201|v-105)", "Separator Vessel"),
    (r"(?:crude\s+storage\s+tank|storage\s+tank|tank\s+tk-?\d+|tk-102|tk-104|tk-105|tk-107)", "Crude Storage Tank"),
    (r"(?:pump\s+p-?\d+|booster\s+pump|centrifugal\s+pump)", "Centrifugal Pump"),
    (r"(?:compressor\s+k-?\d+|gas\s+compressor)", "High Pressure Gas Compressor"),
    (r"(?:rotary\s+table|top\s+drive|bop\s+stack|drill\s+collar)", "Rig Drilling Machinery"),
    (r"(?:mobile\s+crane|hoist\s+wire|winch\s+truck)", "Lifting Crane / Hoist"),
    (r"(?:mcc\s+panel|electrical\s+breaker|busbar)", "Electrical MCC Switchgear"),
    (r"(?:emergency\s+shutdown|esd\s+valve|solenoid)", "ESD Shutdown System"),
    (r"(?:manhole|manway)", "Vessel Manhole"),
]

HAZARDS = [
    ("H2S exposure", [r"h2s", r"hydrogen\s+sulfide", r"sour\s+crude", r"toxic\s+gas"]),
    ("Oxygen deficiency", [r"o2\s+levels?", r"oxygen\s+deficien", r"asphyxiat", r"without\s+.*o2", r"no\s+o2\s+test"]),
    ("Flammable atmosphere / LEL", [r"lel", r"lower\s+explosive\s+limit", r"flammable\s+vapor", r"flammable\s+area"]),
    ("Stored pressure release", [r"residual\s+.*pressure", r"pressurised", r"bar\s+pressure", r"psi", r"relief\s+valve", r"unbolted\s+.*under\s+pressure"]),
    ("Line of fire / Moving iron", [r"line\s+of\s+fire", r"moving\s+iron", r"rotary\s+table", r"struck\s+by", r"hit\s+by", r"projectile", r"whip"]),
    ("Dropped object", [r"dropped\s+object", r"suspended\s+load", r"severed\s+.*wire", r"tong\s+die"]),
    ("Electrocution / Arc flash", [r"electrocution", r"live\s+busbar", r"energized", r"live\s+wire", r"415v"]),
    ("Fall from height", [r"fall\s+(?:from|through|arrest)", r"unprotected\s+edge", r"scaffold.*gap", r"without\s+harness"]),
]

BARRIER_FAILURES = [
    ("No atmospheric testing", [r"without\s+.*atmospheric", r"without\s+.*gas\s+testing", r"gas\s+testing\s+was\s+not\s+performed", r"no\s+gas\s+test", r"levels?\s+not\s+checked", r"before\s+gas\s+freeing"]),
    ("No standby person", [r"no\s+standby\s+person", r"standby\s+person\s+was\s+not\s+present", r"standby\s+absent", r"without\s+standby", r"hole\s+watch\s+absent"]),
    ("No permit to work", [r"without\s+(?:valid\s+)?permit", r"no\s+permit", r"ptw\s+not\s+obtained", r"permit\s+had\s+been\s+issued\s+for\s+the\s+adjacent", r"not\s+endorsed\s+by"]),
    ("No energy isolation / LOTO", [r"before\s+completing\s+.*isolation", r"loto\s+procedure\s+bypassed", r"not\s+isolated", r"not\s+de-energiz", r"without\s+first\s+de-energiz", r"not\s+locked\s*-\s*only\s+tagged"]),
    ("No fire watch", [r"without\s+a\s+fire\s+watch", r"fire\s+watch\s+person\s+had\s+stepped\s+away", r"fire\s+extinguisher\s+not\s+available"]),
    ("Safety device bypassed", [r"bypassed", r"gagged\s+with\s+a\s+c-clamp", r"taped\s+over", r"disabled", r"override"]),
    ("No fall protection / harness", [r"without\s+fall\s+protection", r"without\s+harness", r"no\s+fall\s+arrest", r"not\s+clipped\s+the\s+srl"]),
    ("No spotter / banksman", [r"without\s+banksman", r"without\s+designated\s+spotter", r"exclusion\s+zone\s+not\s+enforced"]),
    ("Lack of PPE / SCBA", [r"without\s+scba", r"without\s+portable\s+personal\s+gas", r"without\s+insulated\s+gloves"]),
    ("Equipment calibration expired", [r"calibration\s+was\s+.*overdue", r"sensor\s+drift", r"detector\s+heads?.*fault"]),
]

CONSEQUENCES_MAP = {
    "H2S exposure": "Toxic exposure / Fatal H2S poisoning",
    "Oxygen deficiency": "Asphyxiation / Loss of consciousness",
    "Flammable atmosphere / LEL": "Flash fire / Explosion",
    "Stored pressure release": "High-pressure crude ejection / Blunt trauma",
    "Line of fire / Moving iron": "Crush injury / Fatal struck-by",
    "Dropped object": "Impact injury / Fatal trauma from height",
    "Electrocution / Arc flash": "Electrocution / Severe arc burns",
    "Fall from height": "Fatal fall from elevation",
}

PERSONNEL_PATTERNS = [
    (r"(?:roughneck|floorman|derrickman)", "Rig Crew Personnel"),
    (r"(?:cleaning\s+technicians?|cleaning\s+crews?|tank\s+cleaner)", "Vessel Cleaning Crew"),
    (r"(?:technician|mechanic|electrician|instrument\s+tech)", "Maintenance Technician"),
    (r"(?:driver|operator|crane\s+operator)", "Equipment Operator"),
    (r"(?:worker|employee|personnel|contractor)", "Field Worker"),
]


# ── EXTRACTION LOGIC ────────────────────────────────────

def extract_factors(text: str) -> Dict[str, Any]:
    """
    Extracts structured risk factors deterministically from field text.
    Returns compliant structured JSON dictionary.
    """
    if not text:
        return {
            "activity": "General Field Work",
            "location": "Facility Grounds",
            "equipment": [],
            "hazards": [],
            "unsafe_acts": [],
            "unsafe_conditions": [],
            "barrier_failures": [],
            "potential_consequences": ["General operational hazard"],
            "affected_personnel": ["Personnel"],
            "relevant_lsr": "General Safety Observation"
        }

    text_lower = text.lower()

    # 1. Activities
    matched_activities = []
    for act_name, patterns in ACTIVITIES:
        for p in patterns:
            if re.search(p, text_lower):
                matched_activities.append(act_name)
                break
    activity = matched_activities[0] if matched_activities else "General Maintenance"

    # Special case handling for direct separator vessel / sludge removal narrative
    if "sludge" in text_lower or "separator" in text_lower:
        if "sludge" in text_lower:
            activity = "Sludge removal"
        elif "vessel" in text_lower or "tank" in text_lower:
            activity = "Confined Space Entry"

    # 2. Location
    matched_locations = []
    for loc_name, patterns in LOCATIONS:
        for p in patterns:
            if re.search(p, text_lower):
                matched_locations.append(loc_name)
                break

    # Extract specific vessel or equipment tags like V-102, TK-104, Pump P-302
    asset_match = re.search(r"\b(v-\d+|tk-\d+|p-\d+|k-\d+)\b", text_lower)
    specific_asset = asset_match.group(1).upper() if asset_match else ""

    if specific_asset and "v-" in specific_asset.lower():
        prefix = f"Separator Vessel {specific_asset}"
        if matched_locations:
            location = f"{prefix}, {matched_locations[0]}"
        else:
            location = prefix
    elif matched_locations:
        location = ", ".join(matched_locations[:2])
    else:
        location = "Facility Grounds"

    # 3. Equipment
    equipment = []
    for p, name in EQUIPMENT_PATTERNS:
        matches = re.findall(p, text_lower)
        if matches:
            for m in matches:
                clean_tag = m.upper().strip()
                if clean_tag not in equipment:
                    equipment.append(clean_tag)

    # 4. Hazards
    hazards = []
    for h_name, patterns in HAZARDS:
        for p in patterns:
            if re.search(p, text_lower):
                if h_name not in hazards:
                    hazards.append(h_name)
                break

    # 5. Barrier Failures
    barrier_failures = []
    for b_name, patterns in BARRIER_FAILURES:
        for p in patterns:
            if re.search(p, text_lower):
                if b_name not in barrier_failures:
                    barrier_failures.append(b_name)
                break

    # 6. Potential Consequences
    consequences = []
    for h in hazards:
        if h in CONSEQUENCES_MAP:
            consequences.append(CONSEQUENCES_MAP[h])

    if any("fatal" in b.lower() or "exposure" in b.lower() for b in hazards) or "No atmospheric testing" in barrier_failures:
        if "Potential fatality" not in consequences:
            consequences.append("Potential fatality")

    if not consequences:
        consequences = ["Operational safety incident"]

    # 7. Unsafe Acts & Unsafe Conditions
    unsafe_acts = []
    unsafe_conditions = []

    if "No atmospheric testing" in barrier_failures:
        unsafe_acts.append("Vessel entry conducted without prior gas testing")
    if "No permit to work" in barrier_failures:
        unsafe_acts.append("Work commenced without authorized Permit to Work")
    if "No energy isolation / LOTO" in barrier_failures:
        unsafe_acts.append("Maintenance attempted without positive energy isolation")
    if "No fall protection / harness" in barrier_failures:
        unsafe_acts.append("Work at height performed without fall arrest protection")

    if "No standby person" in barrier_failures:
        unsafe_conditions.append("Absence of designated standby person / hole watch at manhole")
    if "Safety device bypassed" in barrier_failures:
        unsafe_conditions.append("Critical safety interlock or relief valve bypassed")
    if "Equipment calibration expired" in barrier_failures:
        unsafe_conditions.append("Atmospheric gas detector in fault or calibration overdue")

    # 8. Personnel
    personnel = []
    for p, role in PERSONNEL_PATTERNS:
        if re.search(p, text_lower):
            if role not in personnel:
                personnel.append(role)
    if not personnel:
        personnel = ["Operational Personnel"]

    return {
        "activity": activity,
        "activities": [activity] if isinstance(activity, str) else activity,
        "location": location,
        "locations": [location] if isinstance(location, str) else location,
        "equipment": equipment,
        "hazards": hazards,
        "unsafe_acts": unsafe_acts,
        "unsafe_conditions": unsafe_conditions,
        "barrier_failure": barrier_failures,
        "barrier_failures": barrier_failures,
        "consequences": consequences,
        "potential_consequences": consequences,
        "affected_personnel": personnel,
    }
