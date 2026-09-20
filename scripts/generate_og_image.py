import os
from PIL import Image, ImageDraw, ImageFont

def generate_og_image():
    width, height = 1200, 630
    
    # Base navy image
    img = Image.new("RGB", (width, height), color="#061838")
    draw = ImageDraw.Draw(img)

    # Gradient or soft glow on the right
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # Soft orange ambient halo
    for r in range(260, 0, -5):
        alpha = int((1 - (r / 260.0)) * 40)
        overlay_draw.ellipse(
            [(920 - r, 315 - r), (920 + r, 315 + r)],
            fill=(255, 91, 0, alpha)
        )
    img.paste(overlay, (0, 0), overlay)

    # Load hero image or app icon on the right
    hero_path = "public/art/landing-hero-groceries.jpg"
    if os.path.exists(hero_path):
        hero = Image.open(hero_path).convert("RGB")
        hero = hero.resize((460, 460), Image.Resampling.LANCZOS)
        
        # Rounded corners mask for hero
        mask = Image.new("L", (460, 460), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([(0, 0), (460, 460)], radius=36, fill=255)
        
        # Border
        border_box = Image.new("RGBA", (466, 466), (255, 255, 255, 35))
        border_mask = Image.new("L", (466, 466), 0)
        bm_draw = ImageDraw.Draw(border_mask)
        bm_draw.rounded_rectangle([(0, 0), (466, 466)], radius=38, fill=255)
        img.paste(border_box, (687, 82), border_mask)
        
        img.paste(hero, (690, 85), mask)

    # Logo Mark on the left
    mark_path = "public/dashit-mark-white.png"
    if os.path.exists(mark_path):
        mark = Image.open(mark_path).convert("RGBA")
        mark = mark.resize((70, 70), Image.Resampling.LANCZOS)
        img.paste(mark, (80, 85), mark)

    # Fonts
    # Fallback to default or system truetype
    font_path_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    font_path_reg = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

    if os.path.exists(font_path_bold):
        font_brand = ImageFont.truetype(font_path_bold, 46)
        font_badge = ImageFont.truetype(font_path_bold, 16)
        font_headline = ImageFont.truetype(font_path_bold, 54)
        font_sub = ImageFont.truetype(font_reg if os.path.exists(font_path_reg) else font_path_bold, 22)
        font_stats = ImageFont.truetype(font_path_bold, 28)
        font_stats_sub = ImageFont.truetype(font_reg if os.path.exists(font_path_reg) else font_path_bold, 14)
    else:
        font_brand = font_badge = font_headline = font_sub = font_stats = font_stats_sub = ImageFont.load_default()

    # Brand Title: DASHIT
    draw.text((165, 88), "DASH", fill="#FFFFFF", font=font_brand)
    draw.text((310, 88), "IT", fill="#FF5B00", font=font_brand)

    # Badge Pill: "#1 GROCERY DELIVERY IN ANANTNAG"
    badge_x, badge_y = 80, 190
    draw.rounded_rectangle([(badge_x, badge_y), (badge_x + 390, badge_y + 36)], radius=18, fill="#122B55", outline="#FF5B00", width=1)
    draw.text((badge_x + 18, badge_y + 8), "⚡ #1 GROCERY DELIVERY APP IN ANANTNAG", fill="#FF5B00", font=font_badge)

    # Headline
    draw.text((80, 250), "Groceries & Daily\nEssentials Delivered Fast.", fill="#FFFFFF", font=font_headline, spacing=10)

    # Subtitle
    subtext = "Fresh Kashmiri bakery, milk, dairy, snacks,\nbeverages & staples delivered to your door."
    draw.text((80, 390), subtext, fill="#94A3B8", font=font_sub, spacing=8)

    # Stat Badges at the bottom
    # Stat 1: #1 Fastest
    draw.rounded_rectangle([(80, 485), (250, 560)], radius=20, fill="#0B1E40", outline="#1E3A6E", width=1)
    draw.text((100, 495), "#1 Fastest", fill="#FFFFFF", font=font_stats)
    draw.text((100, 532), "Delivery in Anantnag", fill="#94A3B8", font=font_stats_sub)

    # Stat 2: ₹0 Min Order
    draw.rounded_rectangle([(260, 485), (430, 560)], radius=20, fill="#0B1E40", outline="#1E3A6E", width=1)
    draw.text((280, 495), "₹0 Min", fill="#FF5B00", font=font_stats)
    draw.text((280, 532), "No Minimum Order", fill="#94A3B8", font=font_stats_sub)

    # Stat 3: Anantnag (192101)
    draw.rounded_rectangle([(450, 485), (635, 560)], radius=20, fill="#0B1E40", outline="#1E3A6E", width=1)
    draw.text((470, 495), "Anantnag", fill="#FFFFFF", font=font_stats)
    draw.text((470, 532), "PIN 192101, Kashmir", fill="#94A3B8", font=font_stats_sub)

    # Save
    out_path = "public/og-image.png"
    img.save(out_path, "PNG", quality=95)
    print(f"[SEO] Generated {out_path} ({width}x{height})")

if __name__ == "__main__":
    generate_og_image()
