from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from collections import defaultdict
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend connection

# In-memory storage
transactions = []
cache = {}

def clear_cache():
    """Clear the cache when new data is uploaded"""
    global cache
    cache = {}

@app.route('/upload', methods=['POST'])
def upload_transactions():
    """
    POST /upload
    Accepts JSON array of transactions
    Expected format: [{"id": 1, "amount": 250, "category": "Food", "date": "2025-01-02"}]
    """
    global transactions
    
    try:
        data = request.get_json()
        
        if not data or not isinstance(data, list):
            return jsonify({
                "error": "Invalid data format. Expected JSON array of transactions"
            }), 400
        
        if len(data) == 0:
            return jsonify({
                "error": "Empty transaction list. Please provide at least one transaction"
            }), 400
        
        # Validate and clean transaction structure
        validated_transactions = []
        for idx, txn in enumerate(data):
            if not all(key in txn for key in ['id', 'amount', 'category', 'date']):
                return jsonify({
                    "error": f"Transaction at index {idx} is missing required fields: id, amount, category, date"
                }), 400
            
            # Validate amount is a number
            try:
                amount = float(txn['amount'])
                if amount < 0:
                    return jsonify({
                        "error": f"Transaction at index {idx} has negative amount"
                    }), 400
            except (ValueError, TypeError):
                return jsonify({
                    "error": f"Transaction at index {idx} has invalid amount: {txn['amount']}"
                }), 400
            
            # Create validated transaction
            validated_transactions.append({
                'id': txn['id'],
                'amount': amount,
                'category': str(txn['category']).strip(),
                'date': str(txn['date']).strip()
            })
        
        # Store validated transactions in memory
        transactions = validated_transactions
        clear_cache()  # Clear cache when new data is uploaded
        
        return jsonify({
            "message": "Transactions uploaded successfully",
            "count": len(transactions),
            "categories": list(set(txn['category'] for txn in transactions))
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/summary', methods=['GET'])
def get_summary():
    """
    GET /summary
    Returns comprehensive spending summary with enhanced data for better visualizations
    """
    global cache
    
    # Check cache first
    if 'summary' in cache:
        return jsonify(cache['summary']), 200
    
    if not transactions:
        return jsonify({
            "message": "No transactions found. Please upload data first.",
            "summary": [],
            "grand_total": 0,
            "categories_count": 0,
            "total_transactions": 0,
            "overall_average": 0
        }), 200
    
    # Calculate category-wise spending with additional metrics
    category_data = defaultdict(lambda: {
        'total': 0,
        'count': 0,
        'transactions': []
    })
    
    for txn in transactions:
        category = txn['category']
        amount = float(txn['amount'])  # Ensure amount is a float
        category_data[category]['total'] += amount
        category_data[category]['count'] += 1
        category_data[category]['transactions'].append({
            'amount': amount,
            'date': txn['date']
        })
    
    # Calculate grand total
    grand_total = sum(cat['total'] for cat in category_data.values())
    
    # Format response with enhanced metrics
    summary = []
    for category, data in category_data.items():
        # Safely calculate averages and percentages
        avg_transaction = data['total'] / data['count'] if data['count'] > 0 else 0
        percentage = (data['total'] / grand_total * 100) if grand_total > 0 else 0
        
        # Find highest and lowest transaction in this category
        amounts = [t['amount'] for t in data['transactions']]
        
        summary.append({
            "category": category,
            "total": round(data['total'], 2),
            "count": data['count'],
            "average": round(avg_transaction, 2),
            "percentage": round(percentage, 2),
            "highest": round(max(amounts), 2) if amounts else 0,
            "lowest": round(min(amounts), 2) if amounts else 0
        })
    
    # Sort by total (descending)
    summary.sort(key=lambda x: x['total'], reverse=True)
    
    result = {
        "summary": summary,
        "grand_total": round(grand_total, 2),
        "categories_count": len(summary),
        "total_transactions": len(transactions),
        "overall_average": round(grand_total / len(transactions), 2) if len(transactions) > 0 else 0
    }
    
    # Cache the result
    cache['summary'] = result
    
    return jsonify(result), 200


@app.route('/trends', methods=['GET'])
def get_trends():
    """
    GET /trends
    Returns time-based spending trends (daily, weekly, monthly)
    """
    if not transactions:
        return jsonify({
            "message": "No transactions found. Please upload data first.",
            "trends": []
        }), 200
    
    # Group by month
    monthly_data = defaultdict(lambda: {'total': 0, 'count': 0, 'categories': defaultdict(float)})
    
    for txn in transactions:
        date_obj = datetime.strptime(txn['date'], '%Y-%m-%d')
        month_key = date_obj.strftime('%Y-%m')  # Format: 2025-01
        
        monthly_data[month_key]['total'] += txn['amount']
        monthly_data[month_key]['count'] += 1
        monthly_data[month_key]['categories'][txn['category']] += txn['amount']
    
    # Format monthly trends
    monthly_trends = []
    for month, data in sorted(monthly_data.items()):
        monthly_trends.append({
            'month': month,
            'total': round(data['total'], 2),
            'count': data['count'],
            'average': round(data['total'] / data['count'], 2),
            'top_category': max(data['categories'].items(), key=lambda x: x[1])[0],
            'categories': {cat: round(amt, 2) for cat, amt in data['categories'].items()}
        })
    
    return jsonify({
        "monthly_trends": monthly_trends,
        "months_count": len(monthly_trends)
    }), 200


@app.route('/category-details/<category>', methods=['GET'])
def get_category_details(category):
    """
    GET /category-details/<category>
    Returns detailed breakdown for a specific category
    """
    if not transactions:
        return jsonify({
            "error": "No transactions found"
        }), 404
    
    category_txns = [txn for txn in transactions if txn['category'] == category]
    
    if not category_txns:
        return jsonify({
            "error": f"No transactions found for category: {category}"
        }), 404
    
    total = sum(txn['amount'] for txn in category_txns)
    amounts = [txn['amount'] for txn in category_txns]
    
    # Sort transactions by date
    category_txns.sort(key=lambda x: x['date'])
    
    return jsonify({
        "category": category,
        "total": round(total, 2),
        "count": len(category_txns),
        "average": round(total / len(category_txns), 2),
        "highest": max(amounts),
        "lowest": min(amounts),
        "transactions": category_txns
    }), 200


@app.route('/insight', methods=['GET'])
def get_insights():
    """
    GET /insight
    Returns enhanced insights about spending patterns
    """
    if not transactions:
        return jsonify({
            "insights": ["No transactions available. Upload data to see insights."]
        }), 200
    
    insights = []
    
    # Calculate category totals
    category_totals = defaultdict(float)
    category_counts = defaultdict(int)
    
    for txn in transactions:
        category_totals[txn['category']] += txn['amount']
        category_counts[txn['category']] += 1
    
    # Insight 1: Highest spending category
    if category_totals:
        max_category = max(category_totals.items(), key=lambda x: x[1])
        percentage = (max_category[1] / sum(category_totals.values())) * 100
        insights.append(
            f"Your highest spend is on {max_category[0]} (₹{max_category[1]:.2f}), which is {percentage:.1f}% of your total spending"
        )
    
    # Insight 2: Average transaction value
    total_amount = sum(txn['amount'] for txn in transactions)
    avg_transaction = total_amount / len(transactions)
    insights.append(
        f"Your average transaction value is ₹{avg_transaction:.2f} across {len(transactions)} transactions"
    )
    
    # Insight 3: Most frequent category
    most_frequent = max(category_counts.items(), key=lambda x: x[1])
    insights.append(
        f"You make the most transactions in {most_frequent[0]} ({most_frequent[1]} transactions)"
    )
    
    # Insight 4: Smallest spending category
    if len(category_totals) > 1:
        min_category = min(category_totals.items(), key=lambda x: x[1])
        insights.append(
            f"You spend the least on {min_category[0]} with only ₹{min_category[1]:.2f}"
        )
    
    # Insight 5: High-value transactions
    high_value_txns = [txn for txn in transactions if txn['amount'] > avg_transaction * 2]
    if high_value_txns:
        insights.append(
            f"You have {len(high_value_txns)} high-value transactions (over ₹{avg_transaction*2:.2f})"
        )
    
    return jsonify({"insights": insights}), 200


@app.route('/transactions', methods=['GET'])
def get_transactions():
    """
    GET /transactions
    Returns all uploaded transactions (for frontend table display)
    """
    return jsonify({
        "transactions": transactions,
        "count": len(transactions)
    }), 200


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "transactions_count": len(transactions)
    }), 200


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)