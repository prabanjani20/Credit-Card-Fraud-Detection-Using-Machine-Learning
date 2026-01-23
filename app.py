from flask import Flask, request, jsonify, render_template, send_from_directory
import numpy as np
import pickle
import pandas as pd
import os
import warnings

# ===============================
# IMPORTANT: LIMIT CPU THREADS (Render Fix)
# ===============================
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

warnings.filterwarnings("ignore", category=UserWarning)

app = Flask(__name__)

# ===============================
# FIX: DEFINE FEATURE NAMES ONCE
# ===============================
FEATURE_NAMES = ['Time'] + [f'V{i}' for i in range(1, 29)] + ['Amount']

# ===============================
# LOAD MODELS
# ===============================
with open('ml model/random_forest_model.pkl', 'rb') as f:
    rf_model = pickle.load(f)

with open('ml model/xgboost_model.pkl', 'rb') as f:
    xgb_model = pickle.load(f)

# Force XGBoost to single thread (IMPORTANT)
xgb_model.set_params(n_jobs=1, predictor="cpu_predictor")

with open('ml model/hybrid_thresholds.pkl', 'rb') as f:
    hybrid_cfg = pickle.load(f)

# ===============================
# ROUTES
# ===============================
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

# ===============================
# PREDICTION API (FIXED)
# ===============================
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)

        # Convert input to numpy array
        features = np.array(data['features'], dtype=float)

        if features.size != 30:
            return jsonify({'error': 'Exactly 30 values required'}), 400

        features = features.reshape(1, -1)

        # FIX: Create DataFrame with EXACT feature names
        features_df = pd.DataFrame(features, columns=FEATURE_NAMES)

        selected_model = data.get('model', 'hybrid')

        # -------------------------------
        # RANDOM FOREST
        # -------------------------------
        if selected_model == 'rf':
            prob = rf_model.predict_proba(features_df)[0][1]
            return jsonify({
                'prediction': int(prob >= 0.30),
                'probability': float(prob),
                'model_used': 'Random Forest',
                'accuracy': float(hybrid_cfg['rf_accuracy'])
            })

        # -------------------------------
        # XGBOOST (FIXED)
        # -------------------------------
        if selected_model == 'xgb':
            prob = xgb_model.predict_proba(features_df)[0][1]
            return jsonify({
                'prediction': int(prob >= hybrid_cfg['final_threshold']),
                'probability': float(prob),
                'model_used': 'XGBoost',
                'accuracy': float(hybrid_cfg['xgb_accuracy'])
            })

        # -------------------------------
        # HYBRID (RF + XGB)
        # -------------------------------
        rf_prob = rf_model.predict_proba(features_df)[0][1]
        xgb_prob = xgb_model.predict_proba(features_df)[0][1]

        rf_weight = hybrid_cfg['rf_accuracy']
        xgb_weight = hybrid_cfg['xgb_accuracy']

        final_prob = (rf_prob * rf_weight + xgb_prob * xgb_weight) / (rf_weight + xgb_weight)

        return jsonify({
            'prediction': int(final_prob >= hybrid_cfg['final_threshold']),
            'probability': float(final_prob),
            'rf_probability': float(rf_prob),
            'xgb_probability': float(xgb_prob),
            'model_used': 'Hybrid',
            'accuracy': float(max(rf_weight, xgb_weight))
        })

    except Exception as e:
        print(" Prediction Error:", e)
        return jsonify({
            'error': 'Prediction failed',
            'details': str(e)
        }), 500

# ===============================
# PWA SUPPORT
# ===============================
@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

@app.route('/offline.html')
def offline():
    return render_template('offline.html')

# ===============================
# MAIN
# ===============================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
