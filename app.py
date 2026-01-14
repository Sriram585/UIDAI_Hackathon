import os
import pandas as pd
import numpy as np
from flask import Flask, render_template, jsonify
from datetime import timedelta

# --- CONFIGURATION ---
DATA_FILES = [
    'api_data_aadhar_enrolment_0_500000.csv',
    'api_data_aadhar_enrolment_500000_1000000.csv',
    'api_data_aadhar_enrolment_1000000_1006029.csv'
]

app = Flask(__name__, static_url_path='', static_folder='.', template_folder='.')

class AnalyticalEngine:
    def __init__(self):
        self.df = None
        self._load_data()

    def _load_data(self):
        frames = []
        for file in DATA_FILES:
            if os.path.exists(file):
                try:
                    df = pd.read_csv(file)
                    frames.append(df)
                except: pass
        
        if frames:
            self.df = pd.concat(frames, ignore_index=True)
            self.df['date'] = pd.to_datetime(self.df['date'], errors='coerce')
            
            # Clean State Names (remove whitespace)
            self.df['state'] = self.df['state'].astype(str).str.strip() 

            # Numeric Cleaning
            cols = ['age_0_5', 'age_5_17', 'age_18_greater']
            for c in cols: self.df[c] = pd.to_numeric(self.df[c], errors='coerce').fillna(0)
            
            self.df['total'] = self.df[cols].sum(axis=1)
            self.df = self.df.dropna(subset=['date'])
            
            # Filter out January (1) and February (2) as requested
            self.df = self.df[~self.df['date'].dt.month.isin([1, 2])]
            
            self.df = self.df.sort_values('date')
        else:
            self.df = pd.DataFrame()

    def get_kpis(self):
        if self.df.empty: return {}
        # Calculate Growth
        recent_month = self.df['date'].max().month
        prev = self.df[self.df['date'].dt.month == (recent_month - 1)]['total'].sum()
        curr = self.df[self.df['date'].dt.month == recent_month]['total'].sum()
        growth = ((curr - prev) / prev * 100) if prev > 0 else 0

        return {
            "total": int(self.df['total'].sum()),
            "districts": int(self.df['district'].nunique()),
            "growth_rate": float(round(growth, 2)),
            "top_state": str(self.df.groupby('state')['total'].sum().idxmax())
        }

    def get_trend_data(self):
        """Historical Trend (No Predictions)"""
        monthly = self.df.resample('ME', on='date')['total'].sum().reset_index()
        return {
            "labels": monthly['date'].dt.strftime('%b %Y').tolist(),
            "data": monthly['total'].tolist()
        }

    def get_demographics(self):
        """Age Group Breakdown"""
        data = self.df[['age_0_5', 'age_5_17', 'age_18_greater']].sum()
        return {
            "labels": ["0-5 Years", "5-17 Years", "18+ Years"],
            "data": data.tolist()
        }

    def get_state_performance(self):
        """Top 10 States"""
        top_states = self.df.groupby('state')['total'].sum().sort_values(ascending=False).head(10)
        return {
            "labels": top_states.index.tolist(),
            "data": top_states.values.tolist()
        }

    def get_age_trend(self):
        """Monthly Trend by Age Group"""
        monthly = self.df.resample('ME', on='date')[['age_0_5', 'age_5_17', 'age_18_greater']].sum()
        return {
            "labels": monthly.index.strftime('%b %Y').tolist(),
            "age_0_5": monthly['age_0_5'].tolist(),
            "age_5_17": monthly['age_5_17'].tolist(),
            "age_18_plus": monthly['age_18_greater'].tolist()
        }

    def get_child_hotspots(self):
        """Top 10 Districts for 0-5 Age Group"""
        top = self.df.groupby(['state', 'district'])['age_0_5'].sum().reset_index()
        top = top.sort_values('age_0_5', ascending=False).head(10)
        return {
            "labels": (top['district'] + ", " + top['state']).tolist(),
            "data": top['age_0_5'].tolist()
        }

    def get_state_demographics(self):
        """Demographic Split for Top 5 States"""
        # Get Top 5 States by Total
        top_states = self.df.groupby('state')['total'].sum().sort_values(ascending=False).head(5).index.tolist()
        
        # Filter data for these states
        subset = self.df[self.df['state'].isin(top_states)]
        grouped = subset.groupby('state')[['age_0_5', 'age_5_17', 'age_18_greater']].sum().reindex(top_states)
        
        return {
            "labels": top_states,
            "age_0_5": grouped['age_0_5'].tolist(),
            "age_5_17": grouped['age_5_17'].tolist(),
            "age_18_greater": grouped['age_18_greater'].tolist()
        }

    # --- ADVANCED INSIGHTS (VISUAL) ---

    def get_patterns(self):
        """A. Pattern Chart: Scatter (Child Ratio vs Total Volume)"""
        states = self.df.groupby('state')[['age_0_5', 'total']].sum().reset_index()
        states['child_ratio'] = (states['age_0_5'] / states['total']) * 100
        
        # Return format for Scatter Plot
        # x: Total Volume (log scale implies size), y: Child Ratio
        return {
            "datasets": [{
                "label": "States",
                "data": [{"x": int(r['total']), "y": round(float(r['child_ratio']), 2), "state": str(r['state'])} for _, r in states.iterrows()]
            }]
        }

    def get_deep_trends(self):
        """B. Deep Trend Chart: Multi-Line (Monthly Growth % by Segment)"""
        monthly = self.df.resample('ME', on='date')[['age_0_5', 'age_18_greater']].sum()
        
        # Calculate MoM Growth
        pct_change = monthly.pct_change().fillna(0) * 100
        
        return {
            "labels": monthly.index.strftime('%b %Y').tolist(),
            "child_growth": pct_change['age_0_5'].round(1).tolist(),
            "adult_growth": pct_change['age_18_greater'].round(1).tolist()
        }

    def get_refined_anomalies(self):
        """C. Anomaly Chart: Bubble (x: Date, y: Z-Score, r: Volume)"""
        daily = self.df.groupby(['date', 'district'])['total'].sum().reset_index()
        daily['z'] = (daily['total'] - daily['total'].mean()) / daily['total'].std()
        
        # Filter for significant anomalies
        outliers = daily[daily['z'].abs() > 2.5]
        
        return {
            "datasets": [{
                "label": "Anomalies",
                "data": [{
                    "x": r['date'].strftime('%Y-%m-%d'),
                    "y": round(float(r['z']), 2),
                    "r": min(int(r['total'] / 100), 20), # Scale radius
                    "district": str(r['district'])
                } for _, r in outliers.iterrows()]
            }]
        }

    def get_predictive_indicators(self):
        """D. Prediction Chart: Line (Actual) + Line (Forecast)"""
        monthly = self.df.resample('ME', on='date')['total'].sum()
        x = np.arange(len(monthly))
        y = monthly.values
        
        # Fit Linear Model
        z = np.polyfit(x, y, 1)
        p = np.poly1d(z)
        
        # Forecast 3 months ahead
        future_x = np.arange(len(monthly), len(monthly) + 3)
        future_y = p(future_x)
        
        return {
            "labels": monthly.index.strftime('%b %Y').tolist() + ["Next M1", "Next M2", "Next M3"],
            "actual": [int(v) if not np.isnan(v) else None for v in y] + [None]*3,
            "forecast": [None]*(len(y)-1) + [int(y[-1])] + [int(v) for v in future_y] # Connect last point
        }

    def get_actionable_advice(self):
        """Generate Executive Recommendations based on findings"""
        advice = []
        
        # 1. Analyze Saturation (Adult Trends)
        monthly = self.df.resample('ME', on='date')[['age_18_greater', 'total']].sum()
        if not monthly.empty:
            last_month = monthly.iloc[-1]
            adult_share = last_month['age_18_greater'] / last_month['total']
            
            if adult_share < 0.3:
                advice.append({
                    "title": "Saturation Reached",
                    "severity": "high",
                    "finding": f"Adult enrolments have dropped to {int(adult_share*100)}% of total volume.",
                    "impl": "Adult population is saturated.",
                    "action": "Shift 80% of marketing budget exclusively to 0-5 Child Enrolment campaigns."
                })
        
        # 2. Analyze Fraud/Speed anomalies
        daily = self.df.groupby(['date', 'district'])['total'].sum()
        if not daily.empty:
            max_daily = daily.max()
            if max_daily > 1000: # Abnormally high for a single district/center
                advice.append({
                    "title": "Potential Velocity Fraud",
                    "severity": "critical",
                    "finding": f"District reported {int(max_daily)} enrolments in a single day (Statistical Improbability).",
                    "impl": "Likelihood of batched fake entries or machine script injection.",
                    "action": "Implement 'Speed Limit' Protocol: Auto-freeze operators exceeding 150/day pending bio-auth review."
                })
                
        # 3. Child Gap Analysis
        state_stats = self.df.groupby('state')[['age_0_5', 'total']].sum()
        state_stats['child_ratio'] = state_stats['age_0_5'] / state_stats['total']
        laggards = state_stats.sort_values('child_ratio').head(3)
        
        if not laggards.empty:
            names = ", ".join(laggards.index.tolist())
            advice.append({
                "title": "Child Enrolment Lag",
                "severity": "medium",
                "finding": f"States ({names}) have critically low child update ratios.",
                "impl": "Risk of missing birth rate targets in these regions.",
                "action": "Deploy mobile enrolment vans to Anganwadis in these specific bottom-3 states."
            })

        return advice

    def get_growth_momentum(self):
        """Analyze State-wise Momentum (Accelerators vs Decelerators)"""
        # Get data for last 2 months per state
        monthly_state = self.df.groupby(['state', pd.Grouper(key='date', freq='ME')])['total'].sum().reset_index()
        
        # We need at least 2 filtered months to calc growth
        if monthly_state['date'].nunique() < 2:
            return {"labels": [], "data": []}
            
        last_month = monthly_state['date'].max()
        prev_month = last_month - pd.DateOffset(months=1)
        
        curr_data = monthly_state[monthly_state['date'] == last_month].set_index('state')['total']
        prev_data = monthly_state[monthly_state['date'].dt.month == prev_month.month].set_index('state')['total']
        
        # Calculate Growth % (Handle division by zero)
        momentum = ((curr_data - prev_data) / prev_data * 100).fillna(0)
        
        # Sort and take top/bottom
        momentum = momentum.sort_values(ascending=False)
        
        # Take Top 5 (Accelerators) and Bottom 5 (Decelerators)
        top_5 = momentum.head(5)
        bot_5 = momentum.tail(5)
        
        merged = pd.concat([top_5, bot_5])
        
        # Ensure labels are strings
        return {
            "labels": [str(x) for x in merged.index.tolist()],
            "data": merged.values.round(1).tolist()
        }

engine = AnalyticalEngine()

@app.route('/')
def index(): return render_template('index.html')

@app.route('/api/deep-analysis')
def deep_analysis():
    return jsonify({
        "kpis": engine.get_kpis(),
        "trend": engine.get_trend_data(),
        "demographics": engine.get_demographics(),
        "states": engine.get_state_performance(),
        "age_trend": engine.get_age_trend(),
        "child_hotspots": engine.get_child_hotspots(),
        "state_demographics": engine.get_state_demographics(),
        "user_insights": {
            "patterns": engine.get_patterns(),
            "trends": engine.get_deep_trends(),
            "anomalies": engine.get_refined_anomalies(),
            "predictions": engine.get_predictive_indicators()
        },
        "advice": engine.get_actionable_advice(),
        "momentum": engine.get_growth_momentum()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)