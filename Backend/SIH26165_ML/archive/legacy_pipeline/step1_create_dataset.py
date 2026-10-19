import pandas as pd
import random

# SIF-Potential report templates
sif_reports = [
    "Worker entered {location} without proper gas testing. {gas} levels not checked. No standby person assigned.",
    "Hot work carried out near {flammable} without valid permit. Fire extinguisher not available on site.",
    "Employee working at {height} meters without fall protection harness. Safety net not installed.",
    "Energy isolation not done before maintenance on {equipment}. LOTO procedure bypassed.",
    "Worker found inside {confined} space without atmospheric monitoring. Rescue plan absent.",
    "Vehicle moving in reverse without banksman. Pedestrian {person} nearly struck near {location}.",
    "Crane lift attempted without proper rigging inspection. Load chart not followed by operator.",
    "Ground excavation done without checking underground utility maps. Pipe struck during digging.",
    "Bypassed safety interlock on {equipment} to continue production. Alarm system disabled.",
    "Worker operating angle grinder without face shield. Sparks near fuel storage area.",
    "Operator opened sample bleed valve on sour crude line containing high H2S at Pump Station 4 without SCBA or gas detector.",
    "Technician bypassed High-High Level ESD interlock on separator vessel at Tank Farm B during strainer cleaning.",
    "Heavy winch truck driver reversed near pressure manifold at Drilling Rig 8 without designated spotter or banksman.",
    "Scaffold platform at Processing Plant 1 was incomplete, lacking mid-rails with no fall arrest lanyard anchored.",
]

# Non-SIF report templates  
non_sif_reports = [
    "Housekeeping not maintained near {location}. Waste accumulation observed.",
    "Safety signage faded near {location}. Replacement requested.",
    "Minor oil spill of approximately 2 liters near pump. Contained immediately.",
    "PPE availability low in stores. Requisition raised for restocking.",
    "Lighting inadequate in {location} during night shift. Electrician informed.",
    "Near miss: Worker slipped on wet floor near washroom. No injury. Floor marked wet.",
    "Tool box talk not conducted before morning shift at {location}.",
    "Fire extinguisher inspection overdue by 2 days at {location}. Inspector notified.",
    "Minor hand tool damage reported. Wrench handle cracked. Replaced immediately.",
    "Visitor entered plant without signing gate register. Security counseled.",
]

locations = ["Tank Farm", "Drilling Rig", "Pump Station", "Pipeline ROW", 
             "Compressor Station", "Well Site", "Processing Plant", "Workshop"]
equipment = ["compressor", "pump", "valve", "electrical panel", "conveyor"]
confined = ["storage tank", "vessel", "underground sump", "boiler"]

data = []
for i in range(50):
    if i < 28:  # 28 SIF reports
        template = random.choice(sif_reports)
        text = template.format(
            location=random.choice(locations),
            gas=random.choice(["H2S", "CO", "LEL"]),
            height=random.randint(4, 15),
            equipment=random.choice(equipment),
            confined=random.choice(confined),
            flammable=random.choice(["diesel tank", "gas cylinder", "paint store"]),
            person=random.choice(["narrowly", "almost"])
        )
        data.append({
            'report_id': i+1,
            'report_text': text,
            'sif_label': 1,
            'location': random.choice(locations)
        })
    else:  # 22 Non-SIF reports
        template = random.choice(non_sif_reports)
        text = template.format(location=random.choice(locations))
        data.append({
            'report_id': i+1,
            'report_text': text,
            'sif_label': 0,
            'location': random.choice(locations)
        })

df = pd.DataFrame(data)
df.to_csv('safety_reports.csv', index=False)
print(f"Dataset created: {len(df)} reports")
print(df['sif_label'].value_counts())

