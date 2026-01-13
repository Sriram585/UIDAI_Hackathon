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

    def get_table_data(self):
        """Raw Data for Table (Top 20 Districts)"""
        top = self.df.groupby(['state', 'district'])[['age_0_5', 'age_5_17', 'age_18_greater', 'total']].sum().reset_index()
        top = top.sort_values('total', ascending=False).head(20)
        return top.to_dict(orient='records')

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
        "table": engine.get_table_data()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)