import streamlit as st
from step5_predict import analyze_report
import pandas as pd

# ── TOP INPUT SECTION ──
st.title("🚨 SIF DETECTOR")
report_input = st.text_area(
    "Enter Safety / Near-Miss Report:",
    height=120,
    placeholder="e.g., Worker entered storage tank TK-007 without atmospheric gas testing..."
)

if st.button("ANALYZE REPORT", type="primary"):
    if report_input.strip():
        res = analyze_report(report_input)
        
        st.markdown("---")
        
        # ── 1. SIF POTENTIAL & CONFIDENCE BADGE ──
        if res['sif_potential']:
            st.error(f"⚠️ **SIF POTENTIAL: {res['risk_level']} RISK**\n\n**Confidence:** {res['risk_score']}%")
        else:
            st.success(f"✅ **NON-SIF OBSERVATION: {res['risk_level']} RISK**\n\n**Confidence:** {100 - res['risk_score']}%")
            
        st.info(f"**Recommended Action:** {res['action']}")
        st.markdown("---")

        # ── 2. AI-EXTRACTED RISK FACTORS ──
        st.subheader("📋 AI-EXTRACTED RISK FACTORS")
        
        act = ", ".join(res['precursors']['activity']) or "General Field Work"
        loc = ", ".join(res['precursors']['location']) or "Facility Grounds"
        barriers = res['precursors']['barrier_failure']
        
        st.write(f"• **Activity:** {act}")
        st.write(f"• **Location:** {loc}")
        if barriers:
            for b in barriers:
                st.write(f"• **Barrier Failure:** ❌ {b}")
        else:
            st.write("• **Barrier Failure:** None Identified")

        st.markdown("---")

        # ── 3. APPLICABLE LIFE-SAVING RULE ──
        st.subheader("🛡️ APPLICABLE LIFE-SAVING RULE")
        top_rule = res['lsr_tags'][0]['rule'] if res['lsr_tags'] else "General Safety Observation"
        st.write(f"👉 **{top_rule}**")

        st.markdown("---")

        # ── 4. WHY WAS THIS FLAGGED? (LLM EXPLANATION) ──
        st.subheader("💡 WHY WAS THIS FLAGGED?")
        st.write(res.get('explanation', 'Explanation unavailable.'))

# ── PS 26165 MANDATE: SITE RISK RANKING DASHBOARD ──
st.markdown("---")
st.header("📊 OIL India HSE Site Analytics (PS 26165)")

# Top High-Level Metrics
col1, col2, col3 = st.columns(3)
col1.metric("pSIF Target Ratio", "22.4%", "DEKRA Benchmark (20-25%)")
col2.metric("Highest Risk Facility", "Tank Farm B", "14 Precursors")
col3.metric("Top Barrier Failure", "No Energy Isolation", "9 Incidents")

st.markdown("---")

# 1. Interactive Filter Widget (Block 2)
selected_facility = st.selectbox(
    "Filter Analytics by OIL Operating Facility:",
    ["All Facilities", "Tank Farm B", "Compressor Station 2", "Drilling Rig 8", "Pump Station 4"]
)

# Base Dataset for Dashboard
facility_data = pd.DataFrame({
    'Facility': ['Tank Farm B', 'Compressor Station 2', 'Drilling Rig 8', 'Pump Station 4'],
    'pSIF Count': [14, 11, 8, 4],
    'pSIF Density': ['CRITICAL (38%)', 'HIGH (31%)', 'MEDIUM (22%)', 'LOW (12%)'],
    'Primary Rule': ['Hot Work / Isolation', 'Energy Isolation', 'Line of Fire', 'Confined Space'],
    'Action Level': ['Immediate HSE Audit', 'Supervisor Escalation', 'Routine Review', 'Monitor']
})

# Filter Data Based on User Selection
if selected_facility != "All Facilities":
    filtered_df = facility_data[facility_data['Facility'] == selected_facility]
    st.info(f"Showing localized precursor trends for **{selected_facility}**")
else:
    filtered_df = facility_data

# 2. Interactive Risk Chart (Block 1)
st.subheader("pSIF Precursor Density Bar Chart")
st.bar_chart(filtered_df.set_index('Facility')['pSIF Count'])

# 3. Dynamic Site Risk Table
st.subheader("Site Risk Level Breakdown")
st.dataframe(
    filtered_df[['Facility', 'pSIF Density', 'Primary Rule', 'Action Level']],
    use_container_width=True
)