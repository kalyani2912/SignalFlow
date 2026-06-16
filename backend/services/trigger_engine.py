"""
Trigger Engine — evaluates shoppers against trigger rules.

Supported triggers:
  - BROWSE_ABANDON: 3+ views on products in a category, no purchase in 7 days
  - CART_ABANDON: Added to cart but no purchase in 1 hour
  - POST_PURCHASE_UPSELL: Purchased in last 3 days, recommend complementary products
  - WIN_BACK: No activity in 30+ days, was previously active
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum

from models import TriggerType, ShopperSegment


@dataclass
class ShopperActivity:
    shopper_id: int
    segment: ShopperSegment
    total_views_last_7_days: int
    distinct_products_last_7_days: int
    last_browse_at: datetime | None
    last_purchase_at: datetime | None
    total_purchases: int
    days_since_last_activity: float
    has_cart_event: bool = False
    cart_event_at: datetime | None = None


@dataclass
class TriggerResult:
    shopper_id: int
    trigger_type: TriggerType
    is_triggered: bool
    reason: str
    priority: int = 0

    @property
    def explanation(self) -> str:
        return self.reason


class TriggerRule:
    trigger_type: TriggerType

    def evaluate(self, activity: ShopperActivity, now: datetime | None = None) -> TriggerResult:
        raise NotImplementedError


class BrowseAbandonRule(TriggerRule):
    trigger_type = TriggerType.BROWSE_ABANDON

    def evaluate(self, activity: ShopperActivity, now: datetime | None = None) -> TriggerResult:
        now = now or datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)

        has_enough_views = activity.total_views_last_7_days >= 3
        no_recent_purchase = (
            activity.last_purchase_at is None
            or activity.last_purchase_at < seven_days_ago
        )

        triggered = has_enough_views and no_recent_purchase

        if triggered:
            reason = (
                f"Shopper viewed {activity.total_views_last_7_days} products "
                f"({activity.distinct_products_last_7_days} unique) in the last 7 days "
                f"but hasn't purchased recently. This indicates strong browse-abandon behavior."
            )
            priority = min(activity.total_views_last_7_days, 10)
        else:
            parts = []
            if not has_enough_views:
                parts.append(f"only {activity.total_views_last_7_days} views (need 3+)")
            if not no_recent_purchase:
                parts.append("has a recent purchase")
            reason = f"Not triggered: {'; '.join(parts)}."
            priority = 0

        return TriggerResult(
            shopper_id=activity.shopper_id,
            trigger_type=TriggerType.BROWSE_ABANDON,
            is_triggered=triggered,
            reason=reason,
            priority=priority,
        )


class CartAbandonRule(TriggerRule):
    trigger_type = TriggerType.CART_ABANDON

    def evaluate(self, activity: ShopperActivity, now: datetime | None = None) -> TriggerResult:
        now = now or datetime.utcnow()

        if not activity.has_cart_event or activity.cart_event_at is None:
            return TriggerResult(
                shopper_id=activity.shopper_id,
                trigger_type=TriggerType.CART_ABANDON,
                is_triggered=False,
                reason="No cart event detected.",
                priority=0,
            )

        one_hour_after_cart = activity.cart_event_at + timedelta(hours=1)
        cart_is_stale = now > one_hour_after_cart

        no_purchase_after_cart = (
            activity.last_purchase_at is None
            or activity.last_purchase_at < activity.cart_event_at
        )

        triggered = cart_is_stale and no_purchase_after_cart

        if triggered:
            hours_since = (now - activity.cart_event_at).total_seconds() / 3600
            reason = (
                f"Shopper added items to cart {hours_since:.1f} hours ago "
                f"but hasn't completed purchase. Cart abandon recovery opportunity."
            )
            priority = 8
        else:
            reason = "Cart event is either too recent or purchase was completed."
            priority = 0

        return TriggerResult(
            shopper_id=activity.shopper_id,
            trigger_type=TriggerType.CART_ABANDON,
            is_triggered=triggered,
            reason=reason,
            priority=priority,
        )


class PostPurchaseUpsellRule(TriggerRule):
    trigger_type = TriggerType.POST_PURCHASE_UPSELL

    def evaluate(self, activity: ShopperActivity, now: datetime | None = None) -> TriggerResult:
        now = now or datetime.utcnow()
        three_days_ago = now - timedelta(days=3)

        has_recent_purchase = (
            activity.last_purchase_at is not None
            and activity.last_purchase_at >= three_days_ago
        )

        if has_recent_purchase:
            days_since = (now - activity.last_purchase_at).total_seconds() / 86400
            reason = (
                f"Shopper purchased {days_since:.1f} days ago. "
                f"Great timing for a complementary product recommendation."
            )
            priority = 5
        else:
            reason = "No purchase in the last 3 days."
            priority = 0

        return TriggerResult(
            shopper_id=activity.shopper_id,
            trigger_type=TriggerType.POST_PURCHASE_UPSELL,
            is_triggered=has_recent_purchase,
            reason=reason,
            priority=priority,
        )


class WinBackRule(TriggerRule):
    trigger_type = TriggerType.WIN_BACK

    def evaluate(self, activity: ShopperActivity, now: datetime | None = None) -> TriggerResult:
        now = now or datetime.utcnow()

        is_inactive = activity.days_since_last_activity >= 30
        was_active = activity.total_purchases > 0

        triggered = is_inactive and was_active

        if triggered:
            reason = (
                f"Shopper has been inactive for {activity.days_since_last_activity:.0f} days "
                f"but has {activity.total_purchases} previous purchase(s). "
                f"Win-back campaign could re-engage them."
            )
            priority = 4
        else:
            parts = []
            if not is_inactive:
                parts.append(f"active {activity.days_since_last_activity:.0f} days ago (need 30+)")
            if not was_active:
                parts.append("no previous purchases")
            reason = f"Not triggered: {'; '.join(parts)}."
            priority = 0

        return TriggerResult(
            shopper_id=activity.shopper_id,
            trigger_type=TriggerType.WIN_BACK,
            is_triggered=triggered,
            reason=reason,
            priority=priority,
        )


ALL_RULES: list[TriggerRule] = [
    BrowseAbandonRule(),
    CartAbandonRule(),
    PostPurchaseUpsellRule(),
    WinBackRule(),
]


def evaluate_triggers(activity: ShopperActivity, now: datetime | None = None) -> list[TriggerResult]:
    return [rule.evaluate(activity, now) for rule in ALL_RULES]


def get_triggered(activity: ShopperActivity, now: datetime | None = None) -> list[TriggerResult]:
    results = evaluate_triggers(activity, now)
    triggered = [r for r in results if r.is_triggered]
    triggered.sort(key=lambda r: r.priority, reverse=True)
    return triggered
