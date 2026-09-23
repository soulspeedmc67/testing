import os
import shutil
import plistlib
import subprocess
import json
import sys

BASE_DIR = "/home/aleemkanyu/Projects/Blinkit"
SRC_IPA = "/tmp/gh_ios_dl/Dashit.ipa"
OUT_DIR = os.path.join(BASE_DIR, "out")

FLAVORS = [
    {
        "role": "customer",
        "app_id": "com.dashit.app",
        "display_name": "DASHIT",
        "ipa_names": ["Dashit-User.ipa", "Dashit.ipa", "dashit-user.ipa"],
    },
    {
        "role": "driver",
        "app_id": "com.dashit.driver",
        "display_name": "DASHIT Driver",
        "ipa_names": ["Dashit-Driver.ipa", "dashit-driver.ipa"],
    },
    {
        "role": "admin",
        "app_id": "com.dashit.admin",
        "display_name": "DASHIT Admin",
        "ipa_names": ["Dashit-Admin.ipa", "dashit-admin.ipa"],
    },
]

def build_flavor(flavor, src_ipa):
    role = flavor["role"]
    app_id = flavor["app_id"]
    display_name = flavor["display_name"]
    print(f"\n==========================================")
    print(f"Building IPA for {display_name} ({app_id})...")
    print(f"==========================================")

    staging_dir = f"/tmp/ipa_stage_{role}"
    if os.path.exists(staging_dir):
        shutil.rmtree(staging_dir)
    os.makedirs(staging_dir, exist_ok=True)

    # 1. Unzip base fresh compiled IPA
    subprocess.run(["unzip", "-q", src_ipa, "-d", staging_dir], check=True)
    app_dir = os.path.join(staging_dir, "Payload", "App.app")
    public_dir = os.path.join(app_dir, "public")

    # 2. Clean existing public and copy fresh out/
    if os.path.exists(public_dir):
        shutil.rmtree(public_dir)
    shutil.copytree(OUT_DIR, public_dir)

    # 2b. Update iOS AppIcon files in app_dir
    master_icon_path = os.path.join(BASE_DIR, "public", "dashit-app-icon.png")
    if os.path.exists(master_icon_path):
        from PIL import Image
        master_icon = Image.open(master_icon_path)
        for fname in os.listdir(app_dir):
            if fname.startswith("AppIcon") and fname.endswith(".png"):
                target_file = os.path.join(app_dir, fname)
                try:
                    with Image.open(target_file) as current_icon:
                        w, h = current_icon.size
                    resized = master_icon.resize((w, h), Image.Resampling.LANCZOS)
                    resized.save(target_file, "PNG")
                    print(f"Updated iOS {fname} ({w}x{h}) with text-free logo")
                except Exception as e:
                    print(f"Could not resize {fname}: {e}")

        # Ensure all standard iOS app icon sizes exist with text-free logo
        icon_sizes = {
            "AppIcon60x60@2x.png": (120, 120),
            "AppIcon60x60@3x.png": (180, 180),
            "AppIcon76x76@2x~ipad.png": (152, 152),
            "AppIcon76x76~ipad.png": (76, 76),
            "AppIcon83.5x83.5@2x~ipad.png": (167, 167),
            "AppIcon40x40@2x.png": (80, 80),
            "AppIcon40x40@3x.png": (120, 120),
            "AppIcon29x29@2x.png": (58, 58),
            "AppIcon29x29@3x.png": (87, 87),
            "AppIcon20x20@2x.png": (40, 40),
            "AppIcon20x20@3x.png": (60, 60),
            "AppIcon-512@2x.png": (1024, 1024),
            "AppIcon512@2x.png": (1024, 1024),
            "AppIcon.png": (1024, 1024),
            "iTunesArtwork": (1024, 1024),
            "iTunesArtwork@2x": (1024, 1024),
        }
        for icon_name, (w, h) in icon_sizes.items():
            out_file = os.path.join(app_dir, icon_name)
            resized = master_icon.resize((w, h), Image.Resampling.LANCZOS)
            resized.save(out_file, "PNG")
            print(f"Ensured iOS {icon_name} ({w}x{h}) with text-free logo")

    # 2c. In-place neutralise legacy AppIcon inside compiled Assets.car
    car_path = os.path.join(app_dir, "Assets.car")
    if os.path.exists(car_path):
        with open(car_path, "rb") as f:
            car_data = f.read()
        if b"AppIcon" in car_data:
            patched_car = car_data.replace(b"AppIcon", b"OldIcon")
            with open(car_path, "wb") as f:
                f.write(patched_car)
            print(f"Patched Assets.car: neutralised {car_data.count(b'AppIcon')} legacy AppIcon references")

    # 2d. Copy white Splash into app_dir
    splash_src = os.path.join(BASE_DIR, "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png")
    if os.path.exists(splash_src):
        shutil.copyfile(splash_src, os.path.join(app_dir, "Splash.png"))
        shutil.copyfile(splash_src, os.path.join(app_dir, "Splash@2x.png"))
        shutil.copyfile(splash_src, os.path.join(app_dir, "Splash@3x.png"))

    # 2a. Ensure flat .html files exist for direct iOS WKWebView file scheme lookups
    # (e.g. login/index.html -> login.html) so direct navigation never 404s on iOS
    for root, dirs, files in os.walk(public_dir):
        if "index.html" in files and root != public_dir:
            dir_name = os.path.basename(root)
            parent_dir = os.path.dirname(root)
            flat_html = os.path.join(parent_dir, f"{dir_name}.html")
            if not os.path.exists(flat_html):
                shutil.copyfile(os.path.join(root, "index.html"), flat_html)

    # 2e. Set native app entry index.html directly to the role's native interface
    # (Customer: /shop, Driver: /driver, Admin: /admin) so WKWebView on iOS
    # paints the native experience immediately on launch without ever showing
    # a marketing webpage (App Store Guideline 4.2 compliance).
    role_entry_map = {
        "customer": os.path.join(public_dir, "shop", "index.html"),
        "driver": os.path.join(public_dir, "driver", "index.html"),
        "admin": os.path.join(public_dir, "admin", "index.html"),
    }
    entry_src = role_entry_map.get(role)
    if entry_src and os.path.exists(entry_src):
        shutil.copyfile(entry_src, os.path.join(public_dir, "index.html"))
        print(f"Set native entry public/index.html to {role} interface ({entry_src})")

    # 3. Inject role into all HTML files in public_dir
    injection = f"<script>window.__DASHIT_ROLE__ = '{role}';</script>\n"
    injected_count = 0
    for root, dirs, files in os.walk(public_dir):
        for fname in files:
            if fname.endswith(".html"):
                html_path = os.path.join(root, fname)
                try:
                    with open(html_path, "r", encoding="utf-8") as f:
                        html = f.read()
                    if "window.__DASHIT_ROLE__" not in html:
                        if "<head>" in html:
                            html = html.replace("<head>", f"<head>\n{injection}", 1)
                        else:
                            html = injection + html
                        with open(html_path, "w", encoding="utf-8") as f:
                            f.write(html)
                        injected_count += 1
                except Exception as e:
                    print(f"Could not inject role into {fname}: {e}")
    print(f"Injected window.__DASHIT_ROLE__ = '{role}' into {injected_count} HTML files")

    # 4. Update capacitor.config.json
    cap_json_path = os.path.join(app_dir, "capacitor.config.json")
    if os.path.exists(cap_json_path):
        with open(cap_json_path, "r", encoding="utf-8") as f:
            cap_config = json.load(f)
        cap_config["appId"] = app_id
        cap_config["appName"] = display_name
        with open(cap_json_path, "w", encoding="utf-8") as f:
            json.dump(cap_config, f, indent=2)
        print(f"Updated capacitor.config.json -> appId: {app_id}, appName: {display_name}")

    # 5. Update Info.plist (binary plist)
    plist_path = os.path.join(app_dir, "Info.plist")
    with open(plist_path, "rb") as f:
        pl = plistlib.load(f)
    pl["CFBundleIdentifier"] = app_id
    pl["CFBundleDisplayName"] = display_name
    pl["CFBundleName"] = display_name

    # Point SpringBoard to the loose text-free icon files (no CFBundleIconName referencing old Assets.car)
    icon_files = [
        "AppIcon60x60",
        "AppIcon76x76",
        "AppIcon-512@2x",
        "AppIcon",
    ]
    pl["CFBundleIcons"] = {
        "CFBundlePrimaryIcon": {
            "CFBundleIconFiles": icon_files
        }
    }
    pl["CFBundleIcons~ipad"] = {
        "CFBundlePrimaryIcon": {
            "CFBundleIconFiles": icon_files
        }
    }
    pl["CFBundleIconFile"] = "AppIcon60x60"
    pl["CFBundleIconFiles"] = icon_files

    with open(plist_path, "wb") as f:
        plistlib.dump(pl, f, fmt=plistlib.FMT_BINARY)
    print(f"Updated Info.plist -> CFBundleIdentifier: {app_id}, CFBundleDisplayName: {display_name}")

    # 6. Ensure Mach-O executable binary has executable bit (0755)
    binary_path = os.path.join(app_dir, "App")
    if os.path.exists(binary_path):
        os.chmod(binary_path, 0o755)

    # 7. Zip Payload into IPA
    primary_ipa_name = flavor["ipa_names"][0]
    target_ipa_path = os.path.join(BASE_DIR, primary_ipa_name)
    if os.path.exists(target_ipa_path):
        os.remove(target_ipa_path)

    cmd = ["zip", "-r", "-q", target_ipa_path, "Payload"]
    subprocess.run(cmd, cwd=staging_dir, check=True)
    print(f"Successfully generated {target_ipa_path} ({os.path.getsize(target_ipa_path):,} bytes)")

    # Copy to aliases
    for alias in flavor["ipa_names"][1:]:
        alias_path = os.path.join(BASE_DIR, alias)
        shutil.copyfile(target_ipa_path, alias_path)
        print(f"  -> Linked alias: {alias}")

    # Clean up staging dir
    shutil.rmtree(staging_dir)

def main():
    src = SRC_IPA
    if not os.path.exists(src):
        local_src = os.path.join(BASE_DIR, "Dashit.ipa")
        if os.path.exists(local_src):
            src = local_src
        else:
            raise FileNotFoundError(f"Source IPA not found at {SRC_IPA} or {local_src}")
    print(f"Using base IPA: {src}")

    target_role = None
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower().strip()
        if arg in ["user", "customer"]:
            target_role = "customer"
        elif arg in ["driver", "rider"]:
            target_role = "driver"
        elif arg == "admin":
            target_role = "admin"

    flavors_to_build = [f for f in FLAVORS if f["role"] == target_role] if target_role else FLAVORS
    for flavor in flavors_to_build:
        build_flavor(flavor, src)
    print(f"\nSuccessfully generated {len(flavors_to_build)} IPA(s): {', '.join(f['display_name'] for f in flavors_to_build)}!")

if __name__ == "__main__":
    main()
