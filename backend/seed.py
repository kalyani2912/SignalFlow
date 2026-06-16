"""
Seed script for SignalFlow demo data.
Safe to run multiple times — skips if shoppers table already has data.
"""

import os
import random
import string
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlmodel import Session, select

load_dotenv()

from database import engine, create_db_and_tables
from models import (
    Shopper, Product, BrowseEvent, PurchaseEvent,
    ShopperSegment, ChannelType, ProductCategory,
)

random.seed(42)

PRODUCT_CATALOG = [
    {"name": "Sunset Vibes Tee", "category": ProductCategory.SUMMER_SEASONAL, "price": 29.99, "description": "Express your golden-hour energy with this hand-illustrated sunset design."},
    {"name": "Ocean Breeze Tank", "category": ProductCategory.SUMMER_SEASONAL, "price": 27.99, "description": "Lightweight tank with wave-inspired typography for beach days."},
    {"name": "Tropical Soul Crop Top", "category": ProductCategory.SUMMER_SEASONAL, "price": 25.99, "description": "Cropped fit with bold tropical leaf print and empowering text."},
    {"name": "Solstice Statement Tee", "category": ProductCategory.SUMMER_SEASONAL, "price": 32.99, "description": "Limited-edition summer solstice design celebrating self-expression."},
    {"name": "Heatwave Henley", "category": ProductCategory.SUMMER_SEASONAL, "price": 34.99, "description": "Breathable henley with subtle heat-gradient graphic."},
    {"name": "Poolside Poetry Tee", "category": ProductCategory.SUMMER_SEASONAL, "price": 28.99, "description": "Poetic verse printed on ultrasoft cotton for laid-back summer days."},
    {"name": "Family Roots Matching Set", "category": ProductCategory.FAMILY_MATCHING, "price": 49.99, "description": "Tree-of-life design connecting every family member. Adult + kids sizes."},
    {"name": "Together We Bloom Set", "category": ProductCategory.FAMILY_MATCHING, "price": 47.99, "description": "Floral matching set celebrating growth as a family unit."},
    {"name": "Our Story Tee Duo", "category": ProductCategory.FAMILY_MATCHING, "price": 44.99, "description": "Parent-child tee set with interlocking story illustrations."},
    {"name": "Sunday Funday Family Pack", "category": ProductCategory.FAMILY_MATCHING, "price": 52.99, "description": "Playful weekend-themed matching set for the whole crew."},
    {"name": "Legacy Letters Set", "category": ProductCategory.FAMILY_MATCHING, "price": 46.99, "description": "Monogrammed matching tees with hand-lettered family name."},
    {"name": "Adventure Awaits Trio", "category": ProductCategory.FAMILY_MATCHING, "price": 50.99, "description": "Mountain-explorer matching set for parents and little adventurers."},
    {"name": "Mini Dreamer Onesie", "category": ProductCategory.KIDS_TODDLER, "price": 24.99, "description": "Soft organic cotton onesie with 'Dream Big' cloud illustration."},
    {"name": "Little Explorer Tee", "category": ProductCategory.KIDS_TODDLER, "price": 22.99, "description": "Compass-and-stars design for curious little adventurers."},
    {"name": "Tiny Artist Romper", "category": ProductCategory.KIDS_TODDLER, "price": 26.99, "description": "Paint-splatter design celebrating creativity from day one."},
    {"name": "Giggle Monster Tee", "category": ProductCategory.KIDS_TODDLER, "price": 21.99, "description": "Friendly monster graphic that makes kids smile."},
    {"name": "Brave & Kind Hoodie", "category": ProductCategory.KIDS_TODDLER, "price": 34.99, "description": "Cozy hoodie with empowering message for little ones."},
    {"name": "Star Child Pajama Set", "category": ProductCategory.KIDS_TODDLER, "price": 29.99, "description": "Glow-in-the-dark star pattern for magical bedtimes."},
    {"name": "Mindful Morning Sweatshirt", "category": ProductCategory.LIFESTYLE, "price": 44.99, "description": "Cozy crew neck with 'Be Present' minimalist design."},
    {"name": "Gratitude Journal Tee", "category": ProductCategory.LIFESTYLE, "price": 29.99, "description": "Wearable reminder to count your blessings, hand-lettered."},
    {"name": "Hustle with Heart Hoodie", "category": ProductCategory.LIFESTYLE, "price": 49.99, "description": "Premium hoodie for entrepreneurs who lead with empathy."},
    {"name": "Radiate Kindness Tank", "category": ProductCategory.LIFESTYLE, "price": 25.99, "description": "Lightweight tank spreading positivity wherever you go."},
    {"name": "Balance & Breathe Joggers", "category": ProductCategory.LIFESTYLE, "price": 42.99, "description": "Comfort joggers with subtle wellness-inspired embroidery."},
    {"name": "Authentically Me Tee", "category": ProductCategory.LIFESTYLE, "price": 31.99, "description": "Bold self-love statement tee in unisex fit."},
]

FIRST_NAMES_FEMALE = [
    "Emma", "Olivia", "Ava", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia",
    "Harper", "Evelyn", "Abigail", "Emily", "Ella", "Scarlett", "Grace", "Chloe",
    "Victoria", "Riley", "Aria", "Lily", "Aubrey", "Zoey", "Penelope", "Layla",
    "Nora", "Camila", "Hannah", "Addison", "Luna", "Savannah", "Brooklyn", "Leah",
    "Zoe", "Stella", "Hazel", "Ellie", "Paisley", "Audrey", "Skylar", "Violet",
    "Claire", "Bella", "Aurora", "Lucy", "Anna", "Samantha", "Caroline", "Genesis",
    "Aaliyah", "Kennedy",
]

FIRST_NAMES_MIXED = [
    "James", "Liam", "Noah", "Oliver", "Elijah", "Lucas", "Mason", "Logan",
    "Alexander", "Ethan", "Daniel", "Matthew", "Aiden", "Henry", "Sebastian",
    "Jack", "Owen", "Samuel", "Ryan", "Nathan", "Caleb", "Dylan", "Luke",
    "Andrew", "Isaac",
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
    "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
]

CHANNELS = [ChannelType.SMS, ChannelType.EMAIL, ChannelType.WHATSAPP, ChannelType.INSTAGRAM_DM]
SOURCES = ["homepage", "search", "category", "instagram_ad", "email_link", "direct"]


def generate_email(first: str, last: str, idx: int) -> str:
    domains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com"]
    return f"{first.lower()}.{last.lower()}{idx}@{random.choice(domains)}"


def generate_phone() -> str:
    return f"+1{random.randint(2000000000, 9999999999)}"


def create_shoppers(session: Session) -> list[Shopper]:
    segments = [
        (ShopperSegment.EXPRESSIVE_MOM, 120),
        (ShopperSegment.GIFT_GIVER, 100),
        (ShopperSegment.SELF_EXPRESSER, 110),
        (ShopperSegment.SEASONAL_BUYER, 110),
        (ShopperSegment.LOYAL_RETURNER, 60),
    ]

    shoppers = []
    idx = 0
    for segment, count in segments:
        for i in range(count):
            if segment == ShopperSegment.EXPRESSIVE_MOM:
                first = random.choice(FIRST_NAMES_FEMALE)
            else:
                first = random.choice(FIRST_NAMES_FEMALE + FIRST_NAMES_MIXED)
            last = random.choice(LAST_NAMES)

            ltv = round(random.uniform(25, 500), 2)
            orders = random.randint(0, 12)
            if segment == ShopperSegment.LOYAL_RETURNER:
                ltv = round(random.uniform(150, 800), 2)
                orders = random.randint(4, 20)

            created_days_ago = random.randint(1, 365)
            last_active_days_ago = random.randint(0, min(created_days_ago, 60))

            shopper = Shopper(
                email=generate_email(first, last, idx),
                phone=generate_phone(),
                first_name=first,
                last_name=last,
                segment=segment,
                preferred_channel=random.choice(CHANNELS),
                lifetime_value=ltv,
                total_orders=orders,
                created_at=datetime.utcnow() - timedelta(days=created_days_ago),
                last_active_at=datetime.utcnow() - timedelta(days=last_active_days_ago),
            )
            shoppers.append(shopper)
            idx += 1

    session.add_all(shoppers)
    session.commit()
    for s in shoppers:
        session.refresh(s)
    print(f"  Created {len(shoppers)} shoppers")
    return shoppers


def create_products(session: Session) -> list[Product]:
    products = []
    for item in PRODUCT_CATALOG:
        product = Product(**item)
        products.append(product)

    session.add_all(products)
    session.commit()
    for p in products:
        session.refresh(p)
    print(f"  Created {len(products)} products")
    return products


def create_browse_events(session: Session, shoppers: list[Shopper], products: list[Product]) -> list[BrowseEvent]:
    events = []
    now = datetime.utcnow()
    seasonal_products = [p for p in products if p.category == ProductCategory.SUMMER_SEASONAL]
    all_product_ids = [p.id for p in products]

    abandon_shoppers = random.sample(shoppers, 180)

    for shopper in abandon_shoppers:
        num_views = random.randint(3, 6)
        for _ in range(num_views):
            product = random.choice(seasonal_products)
            hours_ago = random.uniform(1, 168)
            event = BrowseEvent(
                shopper_id=shopper.id,
                product_id=product.id,
                viewed_at=now - timedelta(hours=hours_ago),
                duration_seconds=random.randint(15, 300),
                source=random.choice(SOURCES),
            )
            events.append(event)

    remaining = 3200 - len(events)
    for _ in range(remaining):
        shopper = random.choice(shoppers)
        product_id = random.choice(all_product_ids)
        days_ago = random.uniform(0, 30)
        event = BrowseEvent(
            shopper_id=shopper.id,
            product_id=product_id,
            viewed_at=now - timedelta(days=days_ago),
            duration_seconds=random.randint(5, 300),
            source=random.choice(SOURCES),
        )
        events.append(event)

    session.add_all(events)
    session.commit()
    print(f"  Created {len(events)} browse events")
    return events


def create_purchase_events(
    session: Session,
    shoppers: list[Shopper],
    products: list[Product],
    abandon_shopper_ids: set[int],
) -> list[PurchaseEvent]:
    events = []
    now = datetime.utcnow()

    for i in range(280):
        shopper = random.choice(shoppers)
        product = random.choice(products)

        if shopper.id in abandon_shopper_ids:
            days_ago = random.uniform(8, 30)
        else:
            days_ago = random.uniform(0, 30)

        quantity = random.choices([1, 2, 3], weights=[70, 25, 5])[0]
        order_id = f"ORD-{''.join(random.choices(string.ascii_uppercase + string.digits, k=8))}"

        event = PurchaseEvent(
            shopper_id=shopper.id,
            product_id=product.id,
            quantity=quantity,
            total_amount=round(product.price * quantity, 2),
            purchased_at=now - timedelta(days=days_ago),
            order_id=order_id,
        )
        events.append(event)

    session.add_all(events)
    session.commit()
    print(f"  Created {len(events)} purchase events")
    return events


def seed():
    print("SignalFlow Seed Script")
    print("=" * 40)

    create_db_and_tables()

    with Session(engine) as session:
        existing = session.exec(select(Shopper).limit(1)).first()
        if existing:
            print("Data already exists in shoppers table. Skipping seed.")
            return

        print("Seeding database...")
        shoppers = create_shoppers(session)
        products = create_products(session)

        abandon_shoppers = random.sample(shoppers, 180)
        abandon_shopper_ids = {s.id for s in abandon_shoppers}

        create_browse_events(session, shoppers, products)
        create_purchase_events(session, shoppers, products, abandon_shopper_ids)

        print("=" * 40)
        print("Seed complete!")


if __name__ == "__main__":
    seed()
