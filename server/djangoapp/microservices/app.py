import os
from pathlib import Path
import nltk
from flask import Flask, jsonify
from nltk.sentiment import SentimentIntensityAnalyzer

nltk.data.path.insert(0, str(Path(__file__).parent))
app = Flask(__name__)
sia = SentimentIntensityAnalyzer()

@app.get('/')
def home():
    return jsonify(service='sentiment', status='ok')

@app.get('/analyze/<path:input_txt>')
def analyze_sentiment(input_txt):
    if len(input_txt) > 3000:
        return jsonify(error='Review is too long'), 400
    scores = sia.polarity_scores(input_txt)
    compound = scores['compound']
    sentiment = 'positive' if compound >= .05 else 'negative' if compound <= -.05 else 'neutral'
    return jsonify(sentiment=sentiment, scores=scores)

if __name__ == '__main__':
    from waitress import serve
    serve(app, host=os.getenv('HOST', '127.0.0.1'), port=int(os.getenv('PORT', '5050')))
