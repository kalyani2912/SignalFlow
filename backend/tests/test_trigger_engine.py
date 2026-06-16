"""Tests for the trigger engine."""

import pytest
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.trigger_engine import (
    ShopperActivity,
    TriggerResult,
    BrowseAbandonRule,
    CartAbandonRule,
    PostPurchaseUpsellRule,
    WinBackRule,
    evaluate_triggers,
    get_triggered,
)
from models import TriggerType, ShopperSegment


NOW = datetime(2025, 6, 15, 12, 0, 0)


def make_activity(**overrides) -> ShopperActivity:
    defaults = {
        "shopper_id": 1,
        "segment": ShopperSegment.SELF_EXPRESSER,
        "total_views_last_7_days": 0,
        "distinct_products_last_7_days": 0,
        "last_browse_at": None,
        "last_purchase_at": None,
        "total_purchases": 0,
        "days_since_last_activity": 0,
        "has_cart_event": False,
        "cart_event_at": None,
    }
    defaults.update(overrides)
    return ShopperActivity(**defaults)


class TestBrowseAbandonRule:
    rule = BrowseAbandonRule()

    def test_triggered_with_3_views_no_purchase(self):
        activity = make_activity(
            total_views_last_7_days=3, distinct_products_last_7_days=2,
            last_browse_at=NOW - timedelta(hours=6), last_purchase_at=None,
        )
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True
        assert result.trigger_type == TriggerType.BROWSE_ABANDON

    def test_triggered_with_old_purchase(self):
        activity = make_activity(
            total_views_last_7_days=5, distinct_products_last_7_days=3,
            last_browse_at=NOW - timedelta(hours=12), last_purchase_at=NOW - timedelta(days=10),
        )
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True

    def test_not_triggered_too_few_views(self):
        activity = make_activity(total_views_last_7_days=2, distinct_products_last_7_days=2)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False
        assert "only 2 views" in result.reason

    def test_not_triggered_recent_purchase(self):
        activity = make_activity(
            total_views_last_7_days=5, distinct_products_last_7_days=3,
            last_purchase_at=NOW - timedelta(days=2),
        )
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False
        assert "recent purchase" in result.reason

    def test_priority_scales_with_views(self):
        activity = make_activity(total_views_last_7_days=7, distinct_products_last_7_days=4)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True
        assert result.priority == 7

    def test_priority_caps_at_10(self):
        activity = make_activity(total_views_last_7_days=15, distinct_products_last_7_days=5)
        result = self.rule.evaluate(activity, NOW)
        assert result.priority == 10


class TestCartAbandonRule:
    rule = CartAbandonRule()

    def test_triggered_stale_cart_no_purchase(self):
        activity = make_activity(has_cart_event=True, cart_event_at=NOW - timedelta(hours=3), last_purchase_at=None)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True
        assert result.trigger_type == TriggerType.CART_ABANDON
        assert result.priority == 8

    def test_not_triggered_no_cart_event(self):
        activity = make_activity(has_cart_event=False)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False

    def test_not_triggered_cart_too_recent(self):
        activity = make_activity(has_cart_event=True, cart_event_at=NOW - timedelta(minutes=30))
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False

    def test_not_triggered_purchase_after_cart(self):
        activity = make_activity(
            has_cart_event=True, cart_event_at=NOW - timedelta(hours=2),
            last_purchase_at=NOW - timedelta(hours=1),
        )
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False

    def test_triggered_purchase_before_cart(self):
        activity = make_activity(
            has_cart_event=True, cart_event_at=NOW - timedelta(hours=3),
            last_purchase_at=NOW - timedelta(hours=5),
        )
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True


class TestPostPurchaseUpsellRule:
    rule = PostPurchaseUpsellRule()

    def test_triggered_recent_purchase(self):
        activity = make_activity(last_purchase_at=NOW - timedelta(days=1), total_purchases=3)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True
        assert result.trigger_type == TriggerType.POST_PURCHASE_UPSELL
        assert result.priority == 5

    def test_triggered_at_boundary(self):
        activity = make_activity(last_purchase_at=NOW - timedelta(days=3), total_purchases=1)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True

    def test_not_triggered_old_purchase(self):
        activity = make_activity(last_purchase_at=NOW - timedelta(days=5), total_purchases=2)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False

    def test_not_triggered_no_purchase(self):
        activity = make_activity(last_purchase_at=None)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False


class TestWinBackRule:
    rule = WinBackRule()

    def test_triggered_inactive_with_purchases(self):
        activity = make_activity(days_since_last_activity=45, total_purchases=3)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True
        assert result.trigger_type == TriggerType.WIN_BACK

    def test_triggered_at_30_days(self):
        activity = make_activity(days_since_last_activity=30, total_purchases=1)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is True

    def test_not_triggered_still_active(self):
        activity = make_activity(days_since_last_activity=15, total_purchases=5)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False

    def test_not_triggered_no_purchase_history(self):
        activity = make_activity(days_since_last_activity=60, total_purchases=0)
        result = self.rule.evaluate(activity, NOW)
        assert result.is_triggered is False
        assert "no previous purchases" in result.reason


class TestEvaluateTriggers:
    def test_returns_all_four_rules(self):
        activity = make_activity()
        results = evaluate_triggers(activity, NOW)
        assert len(results) == 4
        types = {r.trigger_type for r in results}
        assert types == {
            TriggerType.BROWSE_ABANDON, TriggerType.CART_ABANDON,
            TriggerType.POST_PURCHASE_UPSELL, TriggerType.WIN_BACK,
        }

    def test_get_triggered_filters_and_sorts(self):
        activity = make_activity(
            has_cart_event=True, cart_event_at=NOW - timedelta(hours=2),
            last_purchase_at=NOW - timedelta(days=1), total_purchases=1,
            total_views_last_7_days=5, distinct_products_last_7_days=3,
        )
        results = get_triggered(activity, NOW)
        trigger_types = [r.trigger_type for r in results]
        assert TriggerType.CART_ABANDON in trigger_types
        assert TriggerType.POST_PURCHASE_UPSELL in trigger_types
        assert results[0].trigger_type == TriggerType.CART_ABANDON

    def test_no_triggers(self):
        activity = make_activity(total_views_last_7_days=0, days_since_last_activity=10, total_purchases=0)
        results = get_triggered(activity, NOW)
        assert len(results) == 0

    def test_multiple_triggers_possible(self):
        activity = make_activity(
            total_views_last_7_days=5, distinct_products_last_7_days=3,
            days_since_last_activity=0, total_purchases=0,
        )
        results = get_triggered(activity, NOW)
        assert any(r.trigger_type == TriggerType.BROWSE_ABANDON for r in results)
