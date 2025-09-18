#!/usr/bin/env python3
"""
Test script to verify endpoints are working correctly.
"""

import requests
import json

BASE_URL = "http://localhost:9000"

def test_endpoints():
    """Test key endpoints to ensure they're working."""
    
    print("🧪 Testing endpoints...")
    
    # Test root endpoint
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Root endpoint: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
    
    # Test sessions endpoint
    try:
        response = requests.get(f"{BASE_URL}/api/my-sessions")
        print(f"✅ Sessions endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Sessions found: {len(data.get('sessions', []))}")
        else:
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Sessions endpoint failed: {e}")
    
    # Test chat history endpoint (this might fail if no sessions exist)
    try:
        response = requests.get(f"{BASE_URL}/api/sessions/test-session/chat-history")
        print(f"✅ Chat history endpoint: {response.status_code}")
        if response.status_code != 200:
            print(f"   Expected 404 for non-existent session: {response.text}")
    except Exception as e:
        print(f"❌ Chat history endpoint failed: {e}")

if __name__ == "__main__":
    test_endpoints()
