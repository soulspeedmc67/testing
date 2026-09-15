import os
from PIL import Image, ImageDraw, ImageOps

BASE_DIR = "/home/aleemkanyu/Projects/Blinkit"

# 1. Load the pure white and navy marks
mark_white = Image.open(os.path.join(BASE_DIR, "public/art/dashit-pure-mark-white.png")).convert("RGBA")
mark_navy = Image.open(os.path.join(BASE_DIR, "public/art/dashit-pure-mark-navy.png")).convert("RGBA")

# Colors
NAVY = (6, 24, 56, 255)       # #061838
WHITE = (255, 255, 255, 255)  # #FFFFFF

def create_icon(size, bg_color, mark_img, scale_factor=0.36):
    """Creates a square icon with solid background and centered scaled logo mark."""
    w, h = size
    target_mark_w = int(w * scale_factor)
    aspect = mark_img.height / mark_img.width
    target_mark_h = int(target_mark_w * aspect)
    
    scaled_mark = mark_img.resize((target_mark_w, target_mark_h), Image.Resampling.LANCZOS)
    
    canvas = Image.new("RGBA", (w, h), bg_color)
    ox = (w - target_mark_w) // 2
    oy = (h - target_mark_h) // 2
    canvas.paste(scaled_mark, (ox, oy), scaled_mark)
    return canvas

def create_round_icon(size, bg_color, mark_img, scale_factor=0.34):
    """Creates a circular icon with transparent corners."""
    w, h = size
    square = create_icon(size, bg_color, mark_img, scale_factor)
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, w, h), fill=255)
    
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(square, (0, 0), mask)
    return out

def create_adaptive_foreground(size, mark_img):
    """Creates an Android adaptive icon foreground (transparent canvas, safe zone inside 66/108 = 61%)."""
    w, h = size
    # Professional smaller logo mark size: 32% of adaptive canvas (sits comfortably inside 61% safe mask)
    target_mark_w = int(w * 0.32)
    aspect = mark_img.height / mark_img.width
    target_mark_h = int(target_mark_w * aspect)
    
    scaled_mark = mark_img.resize((target_mark_w, target_mark_h), Image.Resampling.LANCZOS)
    
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ox = (w - target_mark_w) // 2
    oy = (h - target_mark_h) // 2
    canvas.paste(scaled_mark, (ox, oy), scaled_mark)
    return canvas

# ==========================================
# 1. Master 1024x1024 App Icons
# ==========================================
print("Generating 1024x1024 Master App Icons...")
# Dark navy master icon (36% mark width = ~368px, leaving 328px padding on each side)
icon_1024_dark = create_icon((1024, 1024), NAVY, mark_white, scale_factor=0.36)
icon_1024_dark.save(os.path.join(BASE_DIR, "public/dashit-app-icon.png"), "PNG")
icon_1024_dark.save(os.path.join(BASE_DIR, "public/icon.png"), "PNG")
icon_1024_dark.save(os.path.join(BASE_DIR, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"), "PNG")

# White master icon
icon_1024_white = create_icon((1024, 1024), WHITE, mark_navy, scale_factor=0.36)
icon_1024_white.save(os.path.join(BASE_DIR, "public/dashit-app-icon-white.png"), "PNG")

# Apple touch icon (180x180)
icon_180_touch = create_icon((180, 180), NAVY, mark_white, scale_factor=0.45)
icon_180_touch.save(os.path.join(BASE_DIR, "public/apple-touch-icon.png"), "PNG")

# Browser Tab Favicons (Text-free, prominent clean mark)
# 64x64 light/dark tab icons
fav_64_light = create_icon((64, 64), NAVY, mark_white, scale_factor=0.62)
fav_64_light.save(os.path.join(BASE_DIR, "public/favicon-light.png"), "PNG")

fav_64_dark = create_icon((64, 64), WHITE, mark_navy, scale_factor=0.62)
fav_64_dark.save(os.path.join(BASE_DIR, "public/favicon-dark.png"), "PNG")

# Multi-size ICO for browser tabs (16x16, 32x32, 48x48)
fav_16 = create_icon((16, 16), NAVY, mark_white, scale_factor=0.72)
fav_32 = create_icon((32, 32), NAVY, mark_white, scale_factor=0.65)
fav_48 = create_icon((48, 48), NAVY, mark_white, scale_factor=0.62)
fav_32.save(
    os.path.join(BASE_DIR, "public/favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
    append_images=[fav_16, fav_48]
)

print("Generated master 1024, apple touch icons, and text-free browser tab favicons.")

# ==========================================
# 2. Android Mipmaps
# ==========================================
print("Generating Android Mipmap Icons...")
DENSITIES = {
    "mipmap-mdpi": {"legacy": 48, "adaptive": 108},
    "mipmap-hdpi": {"legacy": 72, "adaptive": 162},
    "mipmap-xhdpi": {"legacy": 96, "adaptive": 216},
    "mipmap-xxhdpi": {"legacy": 144, "adaptive": 324},
    "mipmap-xxxhdpi": {"legacy": 192, "adaptive": 432},
}

for folder, dims in DENSITIES.items():
    dir_path = os.path.join(BASE_DIR, "android/app/src/main/res", folder)
    os.makedirs(dir_path, exist_ok=True)
    
    leg_dim = dims["legacy"]
    adp_dim = dims["adaptive"]
    
    # 1. ic_launcher.png (square legacy)
    ic_legacy = create_icon((leg_dim, leg_dim), NAVY, mark_white, scale_factor=0.36)
    ic_legacy.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")
    
    # 2. ic_launcher_round.png (circular legacy)
    ic_round = create_round_icon((leg_dim, leg_dim), NAVY, mark_white, scale_factor=0.34)
    ic_round.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG")
    
    # 3. ic_launcher_foreground.png (adaptive foreground)
    ic_fg = create_adaptive_foreground((adp_dim, adp_dim), mark_white)
    ic_fg.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")
    
    print(f"  -> {folder}: legacy={leg_dim}x{leg_dim}, adaptive={adp_dim}x{adp_dim}")

print("All Android mipmap icons generated successfully!")
