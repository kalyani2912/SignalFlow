from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from enum import Enum


class ShopperSegment(str, Enum):
    EXPRESSIVE_MOM = "expressive_mom"
    GIFT_GIVER = "gift_giver"
    SELF_EXPRESSER = "self_expresser"
    SEASONAL_BUYER = "seasonal_buyer"
    LOYAL_RETURNER = "loyal_returner"


class ChannelType(str, Enum):
    SMS = "sms"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    INSTAGRAM_DM = "instagram_dm"


class MessageStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    CONVERTED = "converted"
    FAILED = "failed"


class TriggerType(str, Enum):
    BROWSE_ABANDON = "browse_abandon"
    CART_ABANDON = "cart_abandon"
    POST_PURCHASE_UPSELL = "post_purchase_upsell"
    WIN_BACK = "win_back"


class ProductCategory(str, Enum):
    SUMMER_SEASONAL = "summer_seasonal"
    FAMILY_MATCHING = "family_matching"
    KIDS_TODDLER = "kids_toddler"
    LIFESTYLE = "lifestyle"


class Shopper(SQLModel, table=True):
    __tablename__ = "shoppers"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)
    phone: Optional[str] = None
    first_name: str
    last_name: str
    segment: ShopperSegment
    preferred_channel: ChannelType = Field(default=ChannelType.EMAIL)
    lifetime_value: float = Field(default=0.0)
    total_orders: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: Optional[datetime] = None


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: ProductCategory
    price: float
    description: str
    image_url: Optional[str] = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BrowseEvent(SQLModel, table=True):
    __tablename__ = "browse_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    shopper_id: int = Field(foreign_key="shoppers.id", index=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    viewed_at: datetime = Field(default_factory=datetime.utcnow)
    duration_seconds: int = Field(default=0)
    source: Optional[str] = None


class PurchaseEvent(SQLModel, table=True):
    __tablename__ = "purchase_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    shopper_id: int = Field(foreign_key="shoppers.id", index=True)
    product_id: int = Field(foreign_key="products.id", index=True)
    quantity: int = Field(default=1)
    total_amount: float
    purchased_at: datetime = Field(default_factory=datetime.utcnow)
    order_id: str = Field(index=True)


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    shopper_id: int = Field(foreign_key="shoppers.id", index=True)
    trigger_type: TriggerType
    channel: ChannelType
    subject: Optional[str] = None
    body: str
    ai_explanation: str
    intent_score: float = Field(default=0.0)
    status: MessageStatus = Field(default=MessageStatus.PENDING)
    ab_test_id: Optional[int] = Field(default=None, foreign_key="ab_tests.id")
    ab_variant: Optional[str] = None
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BrandProfile(SQLModel, table=True):
    __tablename__ = "brand_profiles"

    id: Optional[int] = Field(default=None, primary_key=True)
    brand_name: str = Field(default="Intuitive Designs Studio")
    voice_tone: str = Field(default="warm, authentic, empowering")
    voice_style: str = Field(default="conversational, inclusive, uplifting")
    banned_words: str = Field(default="cheap,discount,desperate,ugly,boring")
    max_message_length: int = Field(default=160)
    emoji_style: str = Field(default="minimal")
    tagline: Optional[str] = Field(default="Wear What You Mean")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class GuardrailConfig(SQLModel, table=True):
    __tablename__ = "guardrail_configs"

    id: Optional[int] = Field(default=None, primary_key=True)
    brand_profile_id: int = Field(foreign_key="brand_profiles.id")
    frequency_cap_daily: int = Field(default=2)
    frequency_cap_weekly: int = Field(default=5)
    quiet_hours_start: str = Field(default="21:00")
    quiet_hours_end: str = Field(default="09:00")
    min_intent_score: float = Field(default=60.0)
    require_approval_above_score: Optional[float] = None
    cool_down_hours: int = Field(default=24)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class ABTest(SQLModel, table=True):
    __tablename__ = "ab_tests"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    trigger_type: TriggerType
    variant_a_prompt: str
    variant_b_prompt: str
    traffic_split: float = Field(default=0.5)
    is_active: bool = Field(default=True)
    winner: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
