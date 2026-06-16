"""
Intent Scorer — calculates purchase intent from behavioral signals.

Scoring formula (100-point scale):
  - Recency (30 pts): How recently the shopper browsed
  - Frequency (40 pts): How many times they viewed products
  - Category Depth (30 pts): How many distinct products they viewed

Score >= 60 = trigger eligible
"""

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class IntentSignals:
    last_browse_hours_ago: float
    total_views: int
    distinct_products_viewed: int


@dataclass
class IntentScore:
    total: float
    recency_score: float
    frequency_score: float
    depth_score: float
    is_trigger_eligible: bool

    @property
    def explanation(self) -> str:
        parts = []
        if self.recency_score >= 22:
            parts.append("browsed very recently")
        elif self.recency_score >= 14:
            parts.append("browsed within the last few days")
        else:
            parts.append("hasn't browsed recently")

        if self.frequency_score >= 28:
            parts.append("viewed products multiple times")
        elif self.frequency_score >= 16:
            parts.append("showed moderate browsing activity")
        else:
            parts.append("had minimal browsing activity")

        if self.depth_score >= 20:
            parts.append("explored multiple products")
        else:
            parts.append("focused on a single product")

        status = "qualifies for triggered messaging" if self.is_trigger_eligible else "does not yet qualify for triggered messaging"
        return f"This shopper {', '.join(parts)}. Score: {self.total:.0f}/100 — {status}."


TRIGGER_THRESHOLD = 60.0


def score_recency(hours_ago: float) -> float:
    if hours_ago <= 24:
        return 30.0
    elif hours_ago <= 48:
        return 22.0
    elif hours_ago <= 72:
        return 14.0
    else:
        return 0.0


def score_frequency(total_views: int) -> float:
    if total_views <= 0:
        return 0.0
    elif total_views == 1:
        return 8.0
    elif total_views == 2:
        return 16.0
    elif total_views == 3:
        return 28.0
    else:
        return 40.0


def score_category_depth(distinct_products: int) -> float:
    if distinct_products <= 0:
        return 0.0
    elif distinct_products == 1:
        return 10.0
    elif distinct_products == 2:
        return 20.0
    else:
        return 30.0


def calculate_intent_score(signals: IntentSignals) -> IntentScore:
    recency = score_recency(signals.last_browse_hours_ago)
    frequency = score_frequency(signals.total_views)
    depth = score_category_depth(signals.distinct_products_viewed)
    total = recency + frequency + depth

    return IntentScore(
        total=total,
        recency_score=recency,
        frequency_score=frequency,
        depth_score=depth,
        is_trigger_eligible=total >= TRIGGER_THRESHOLD,
    )
