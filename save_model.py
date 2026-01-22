import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
from sklearn.metrics import accuracy_score

# Load dataset
df = pd.read_csv('dataset/creditcard.csv')

X = df.drop('Class', axis=1)
y = df['Class']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Random Forest
rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    class_weight='balanced',
    random_state=42
)
rf_model.fit(X_train, y_train)

# XGBoost
xgb_model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric='logloss',
    scale_pos_weight=len(y_train[y_train == 0]) / len(y_train[y_train == 1]),
    random_state=42
)
xgb_model.fit(X_train, y_train)

# Accuracies
rf_acc = accuracy_score(y_test, rf_model.predict(X_test))
xgb_acc = accuracy_score(y_test, xgb_model.predict(X_test))

# Save models
with open('ml model/random_forest_model.pkl', 'wb') as f:
    pickle.dump(rf_model, f)

with open('ml model/xgboost_model.pkl', 'wb') as f:
    pickle.dump(xgb_model, f)

# Hybrid thresholds
hybrid_thresholds = {
    "rf_threshold": 0.6,
    "xgb_threshold": 0.6,
    "final_threshold": 0.5,
    "rf_accuracy": rf_acc,
    "xgb_accuracy": xgb_acc
}

with open('ml model/hybrid_thresholds.pkl', 'wb') as f:
    pickle.dump(hybrid_thresholds, f)

print(" Hybrid model saved successfully")
print("RF Accuracy:", rf_acc)
print("XGB Accuracy:", xgb_acc)
