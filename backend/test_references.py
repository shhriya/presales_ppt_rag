#!/usr/bin/env python3
"""
Test script to verify reference generation works correctly.
"""

import sys
import os
sys.path.append('.')

from logic.qa import search_and_answer
import json

def test_reference_generation():
    """Test that reference generation works correctly."""

    # Mock data for testing
    texts = [
        "This is content from page 1 about introduction",
        "This is content from page 2 about features",
        "This is content from page 3 about benefits",
        "This is more content from page 2 about advanced features",
        "This is content from page 4 about pricing"
    ]

    metadata = [
        {"page": 1, "file_id": "test_session_test.pdf"},
        {"page": 2, "file_id": "test_session_test.pdf"},
        {"page": 3, "file_id": "test_session_test.pdf"},
        {"page": 2, "file_id": "test_session_test.pdf"},
        {"page": 4, "file_id": "test_session_test.pdf"}
    ]

    # Test question that should match page 2 content
    question = "Tell me about features"
    index = None  # Using fallback mode

    result = search_and_answer(question, index, texts, metadata)

    print("Question:", question)
    print("Answer:", result["text"][:100] + "...")
    print("References:", json.dumps(result["references"], indent=2))

    # Check for duplicates
    pages = [ref["page"] for ref in result["references"]]
    if len(pages) != len(set(pages)):
        print("❌ DUPLICATE REFERENCES FOUND!")
        return False
    else:
        print("✅ No duplicate references found")

    # Check that percentages sum to 100 (or close)
    total_percentage = sum(ref["accuracy"] for ref in result["references"])
    print(f"Total percentage: {total_percentage}")

    if abs(total_percentage - 100.0) > 0.1:
        print("❌ Percentages don't sum to 100!")
        return False
    else:
        print("✅ Percentages sum correctly")

    return True

if __name__ == "__main__":
    success = test_reference_generation()
    if success:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)
