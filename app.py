from flask import Flask, request, jsonify, render_template, send_from_directory
import numpy as np
import pickle
import pandas as pd
import os
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

app = Flask(__name__)

# Load Hybrid Models
with open('ml model/random_forest_model.pkl', 'rb') as f:
    rf_model = pickle.load(f)

with open('ml model/xgboost_model.pkl', 'rb') as f:
    xgb_model = pickle.load(f)

with open('ml model/hybrid_thresholds.pkl', 'rb') as f:
    hybrid_cfg = pickle.load(f)

# Routes 
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/index.html')
def index():
    return render_template('index.html')

@app.route('/visualizations.html')
def visualizations():
    return render_template('visualizations.html')

@app.route('/analysis.html')
def analysis():
    return render_template('analysis.html')

@app.route('/amount-trends.html')
def amount_trends():
    return render_template('amount-trends.html')

@app.route('/feature.html')
def feature():
    return render_template('feature.html')

@app.route('/theory.html')
def theory():
    return render_template('theory.html')

@app.route('/model.html')
def model():
    return render_template('model.html')

@app.route('/privacy-policy.html')
def privacy_policy():
    return render_template('privacy-policy.html')

@app.route('/terms-conditions.html')
def terms_conditions():
    return render_template('terms-conditions.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json

    features = np.array(data['features'], dtype=float)

    if features.size != 30:
        return jsonify({'error': 'Exactly 30 values required'}), 400

    features = features.reshape(1, -1)

    selected_model = data.get('model', 'hybrid')

    feature_names = ['Time'] + [f'V{i}' for i in range(1, 29)] + ['Amount']
    features_df = pd.DataFrame(features, columns=feature_names)

    # Random Forest
    if selected_model == 'rf':
        prob = rf_model.predict_proba(features_df)[0][1]
        prediction = int(prob >= 0.30)

        return jsonify({
            'prediction': prediction,
            'probability': float(prob),
            'model_used': 'Random Forest',
            'accuracy': float(hybrid_cfg['rf_accuracy'])
        })

    # XGBoost
    if selected_model == 'xgb':
        prob = xgb_model.predict_proba(features_df)[0][1]
        prediction = int(prob >= hybrid_cfg['final_threshold'])

        return jsonify({
            'prediction': prediction,
            'probability': float(prob),
            'model_used': 'XGBoost',
            'accuracy': float(hybrid_cfg['xgb_accuracy'])
        })

    # Hybrid
    rf_prob = rf_model.predict_proba(features_df)[0][1]
    xgb_prob = xgb_model.predict_proba(features_df)[0][1]

    rf_weight = hybrid_cfg['rf_accuracy']
    xgb_weight = hybrid_cfg['xgb_accuracy']

    final_prob = (rf_prob * rf_weight + xgb_prob * xgb_weight) / (rf_weight + xgb_weight)
    prediction = int(final_prob >= hybrid_cfg['final_threshold'])

    return jsonify({
        'prediction': prediction,
        'probability': float(final_prob),
        'rf_probability': float(rf_prob),
        'xgb_probability': float(xgb_prob),
        'model_used': 'Hybrid',
        'accuracy': float(max(rf_weight, xgb_weight))
    })

# Add route for service worker
@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

# Add route for manifest
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

# Add route for offline page
@app.route('/offline.html')
def offline():
    return render_template('offline.html')

def prepare_features(features_array):
    """Convert numpy array to DataFrame with proper feature names"""
    feature_names = ['id'] + [f'V{i}' for i in range(1, 29)] + ['Amount']
    return pd.DataFrame(features_array, columns=feature_names)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)


