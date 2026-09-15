import os
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(BASE_DIR, "public/dashit-logo-centered.png")

logo = Image.open(LOGO_PATH).convert("RGBA")

# Pure white background for seamless clean launch
BG_WHITE = (255, 255, 255, 255)

def make_solid_white(width, height):
    """Creates a pure solid white splash image."""
    return Image.new("RGBA", (width, height), BG_WHITE)

def make_transparent_icon(size=1):
    """Creates a transparent 1x1 icon for the initial OS launch."""
    return Image.new("RGBA", (size, size), (0, 0, 0, 0))

def main():
    print("Generating pure white native splash screen assets...")
    
    # Android portrait targets
    android_port = {
        "android/app/src/main/res/drawable/splash.png": (480, 800),
        "android/app/src/main/res/drawable-port-mdpi/splash.png": (320, 480),
        "android/app/src/main/res/drawable-port-hdpi/splash.png": (480, 800),
        "android/app/src/main/res/drawable-port-xhdpi/splash.png": (720, 1280),
        "android/app/src/main/res/drawable-port-xxhdpi/splash.png": (960, 1600),
        "android/app/src/main/res/drawable-port-xxxhdpi/splash.png": (1280, 1920),
    }
    
    for rel_path, (w, h) in android_port.items():
        out_path = os.path.join(BASE_DIR, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        img = make_solid_white(w, h)
        img.save(out_path, "PNG")
        print(f"Created white splash: {rel_path} ({w}x{h})")
        
    # Android landscape targets
    android_land = {
        "android/app/src/main/res/drawable-land-mdpi/splash.png": (480, 320),
        "android/app/src/main/res/drawable-land-hdpi/splash.png": (800, 480),
        "android/app/src/main/res/drawable-land-xhdpi/splash.png": (1280, 720),
        "android/app/src/main/res/drawable-land-xxhdpi/splash.png": (1600, 960),
        "android/app/src/main/res/drawable-land-xxxhdpi/splash.png": (1920, 1280),
    }
    
    for rel_path, (w, h) in android_land.items():
        out_path = os.path.join(BASE_DIR, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        img = make_solid_white(w, h)
        img.save(out_path, "PNG")
        print(f"Created white splash: {rel_path} ({w}x{h})")
        
    # Android 12+ Splash Icon (transparent so OS launch is simple pure white)
    a12_icon_path = os.path.join(BASE_DIR, "android/app/src/main/res/drawable/splash_icon.png")
    a12_icon = make_transparent_icon(1)
    a12_icon.save(a12_icon_path, "PNG")
    print(f"Created transparent: android/app/src/main/res/drawable/splash_icon.png")
    
    # iOS Splash Screen Targets (pure solid white)
    ios_splash = [
        "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
        "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png",
        "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png",
    ]
    
    ios_img = make_solid_white(2732, 2732)
    for rel_path in ios_splash:
        out_path = os.path.join(BASE_DIR, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        ios_img.save(out_path, "PNG")
        print(f"Created white splash: {rel_path} (2732x2732)")

    print("All native splash screens successfully set to pure white!")

if __name__ == "__main__":
    main()
