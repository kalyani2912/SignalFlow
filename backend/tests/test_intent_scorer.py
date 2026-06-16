"""Tests for the intent scoring engine."""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.intent_scorer import (
    IntentSignals,
    IntentScore,
    calculate_intent_score,
    score_recency,
    score_frequency,
    score_category_depth,
    TRIGGER_THRESHOLD,
)


class TestScoreRecency:
    def test_within_24_hours(self):
        assert score_recency(1) == 30.0
        assert score_recency(12) == 30.0
        assert score_recency(24) == 30.0

    def test_within_48_hours(self):
        assert score_recency(25) == 22.0
        assert score_recency(36) == 22.0
        assert score_recency(48) == 22.0

    def test_within_72_hours(self):
        assert score_recency(49) == 14.0
        assert score_recency(60) == 14.0
        assert score_recency(72) == 14.0

    def test_beyond_72_hours(self):
        assert score_recency(73) == 0.0
        assert score_recency(200) == 0.0

    def test_zero_hours(self):
        assert score_recency(0) == 30.0

    def test_boundary_exact(self):
        assert score_recency(24) == 30.0
        assert score_recency(24.01) == 22.0
        assert score_recency(48) == 22.0
        assert score_recency(48.01) == 14.0
        assert score_recency(72) == 14.0
        assert score_recency(72.01) == 0.0


class TestScoreFrequency:
    def test_zero_views(self):
        assert score_frequency(0) == 0.0

    def test_one_view(self):
        assert score_frequency(1) == 8.0

    def test_two_views(self):
        assert score_frequency(2) == 16.0

    def test_three_views(self):
        assert score_frequency(3) == 28.0

    def test_four_plus_views(self):
        assert score_frequency(4) == 40.0
        assert score_frequency(10) == 40.0
        assert score_frequency(100) == 40.0

    def test_negative_views(self):
        assert score_frequency(-1) == 0.0


class TestScoreCategoryDepth:
    def test_zero_products(self):
        assert score_category_depth(0) == 0.0

    def test_one_product(self):
        assert score_category_depth(1) == 10.0

    def test_two_products(self):
        assert score_category_depth(2) == 20.0

    def test_three_plus_products(self):
        assert score_category_depth(3) == 30.0
        assert score_category_depth(5) == 30.0
        assert score_category_depth(20) == 30.0

    def test_negative_products(self):
        assert score_category_depth(-1) == 0.0


class TestCalculateIntentScore:
    def test_max_score(self):
        signals = IntentSignals(last_browse_hours_ago=1, total_views=5, distinct_products_viewed=4)
        result = calculate_intent_score(signals)
        assert result.total == 100.0
        assert result.recency_score == 30.0
        assert result.frequency_score == 40.0
        assert result.depth_score == 30.0
        assert result.is_trigger_eligible is True

    def test_min_score(self):
        signals = IntentSignals(last_browse_hours_ago=100, total_views=0, distinct_products_viewed=0)
        result = calculate_intent_score(signals)
        assert result.total == 0.0
        assert result.is_trigger_eligible is False

    def test_threshold_exact(self):
        signals = IntentSignals(last_browse_hours_ago=30, total_views=3, distinct_products_viewed=1)
        result = calculate_intent_score(signals)
        assert result.total == 60.0
        assert result.is_trigger_eligible is True

    def test_just_below_threshold(self):
        signals = IntentSignals(last_browse_hours_ago=30, total_views=2, distinct_products_viewed=2)
        result = calculate_intent_score(signals)
        assert result.total == 58.0
        assert result.is_trigger_eligible is False

    def test_typical_browse_abandon(self):
        signals = IntentSignals(last_browse_hours_ago=6, total_views=5, distinct_products_viewed=3)
        result = calculate_intent_score(signals)
        assert result.total == 100.0
        assert result.is_trigger_eligible is True

    def test_casual_browser(self):
        signals = IntentSignals(last_browse_hours_ago=50, total_views=1, distinct_products_viewed=1)
        result = calculate_intent_score(signals)
        assert result.total == 32.0
        assert result.is_trigger_eligible is False

    def test_explanation_contains_score(self):
        signals = IntentSignals(last_browse_hours_ago=6, total_views=5, distinct_products_viewed=3)
        result = calculate_intent_score(signals)
        assert "100" in result.explanation
        assert "qualifies" in result.explanation

    def test_explanation_not_eligible(self):
        signals = IntentSignals(last_browse_hours_ago=100, total_views=1, distinct_products_viewed=1)
        result = calculate_intent_score(signals)
        assert "does not yet qualify" in result.explanation

    def test_trigger_threshold_constant(self):
        assert TRIGGER_THRESHOLD == 60.0
