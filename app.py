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
            self.df = self.df.dropna(subset=['date']).sort_values('date')
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
            "districts": self.df['district'].nunique(),
            "growth_rate": round(growth, 2),
            "top_state": self.df.groupby('state')['total'].sum().idxmax()
        }

    def get_forecast(self):
        """Linear Regression Forecast"""
        monthly = self.df.resample('ME', on='date')['total'].sum().reset_index()
        if len(monthly) < 2: return {}
        
        x = np.arange(len(monthly))
        y = monthly['total'].values
        z = np.polyfit(x, y, 1) # Slope and Intercept
        p = np.poly1d(z)
        
        # Forecast 3 months ahead
        future_x = np.arange(len(monthly), len(monthly) + 3)
        future_y = p(future_x)
        
        labels = monthly['date'].dt.strftime('%b %Y').tolist() + ["Next Month", "Month +2", "Month +3"]
        return {
            "labels": labels,
            "actual": list(y) + [None]*3,
            "projected": [None]*(len(y)-1) + [y[-1]] + list(future_y), # Connect lines
            "slope": round(z[0], 2)
        }

    def get_radar_data(self):
        """Comparative Analysis: Top 3 States vs Age Groups"""
        top_states = self.df.groupby('state')['total'].sum().sort_values(ascending=False).head(3).index
        result = {"labels": ["0-5 Years", "5-17 Years", "18+ Years"], "datasets": []}
        
        for state in top_states:
            state_data = self.df[self.df['state'] == state][['age_0_5', 'age_5_17', 'age_18_greater']].sum()
            result["datasets"].append({
                "label": state,
                "data": state_data.tolist()
            })
        return result

    def get_polar_data(self):
        """Market Share: Top 5 States"""
        top = self.df.groupby('state')['total'].sum().sort_values(ascending=False).head(5)
        return {"labels": top.index.tolist(), "values": top.values.tolist()}

    def get_anomalies(self):
        """Outlier Detection"""
        stats = self.df.groupby(['state', 'district'])['total'].sum().reset_index()
        stats['z'] = (stats['total'] - stats['total'].mean()) / stats['total'].std()
        outliers = stats[stats['z'] > 2.0].head(15) # Top 15 anomalies
        return {
            "districts": outliers['district'].tolist(),
            "values": outliers['total'].tolist(),
            "z_scores": outliers['z'].round(2).tolist()
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
        "forecast": engine.get_forecast(),
        "radar": engine.get_radar_data(),
        "polar": engine.get_polar_data(),
        "anomalies": engine.get_anomalies(),
        "table": engine.get_table_data()
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)