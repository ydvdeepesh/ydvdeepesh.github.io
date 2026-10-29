"""Flat textures for the room (map, labels, lanyard cards). Run: python3 blender/textures.py"""
import json, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = f"{HERE}/tex"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# globe texture: full equirectangular world, visited countries coloured, pins painted on
W, H = 4096, 2048
VISITED = {"Portugal", "Spain", "France", "Czechia", "Netherlands", "Poland", "Italy", "Luxembourg", "Switzerland"}
HOME = {"Germany", "India"}

def px(lon, lat):
    return (lon + 180) / 360 * W, (90 - lat) / 180 * H

def world_map():
    im = Image.new("RGB", (W, H), (120, 160, 182))
    d = ImageDraw.Draw(im)
    for lon in range(-180, 181, 15):
        d.line([px(lon, 90), px(lon, -90)], fill=(110, 150, 172), width=3)
    for lat in range(-75, 76, 15):
        d.line([px(-180, lat), px(180, lat)], fill=(110, 150, 172), width=3)
    pins = {}
    for f in json.load(open(f"{HERE}/assets/countries.geojson"))["features"]:
        name, g = f["properties"]["NAME"], f["geometry"]
        fill = (200, 85, 61) if name in HOME else (226, 164, 88) if name in VISITED else (239, 230, 210)
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            far = poly[0][0][0] < -30 and name in VISITED  # French Guiana is France, but not visited
            d.polygon([px(*p) for p in poly[0]], fill=(239, 230, 210) if far else fill, outline=(120, 110, 95))
        if name in VISITED | HOME:
            pins[name] = (f["properties"]["LABEL_X"], f["properties"]["LABEL_Y"])
    pins.setdefault("Luxembourg", (6.1, 49.7))  # too small for the 110m data set
    for name, (lon, lat) in pins.items():
        x, y = px(lon, lat)
        c = (40, 70, 170) if name in HOME else (190, 25, 25)
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=c, outline=(255, 255, 255), width=3)
    im.save(f"{OUT}/globe.jpg", quality=88)
    im.resize((2048, 1024), Image.LANCZOS).save(f"{HERE}/../public/room/globe.webp", quality=86)  # the popup globe in the browser
    json.dump(pins, open(f"{OUT}/globe_pins.json", "w"), indent=1)  # lon, lat for the web markers
    # dark crop for the desk mat (his real mat is a world map too)
    Image.eval(im.crop((0, int(H * 0.1), W, int(H * 0.8))).resize((1600, 600)).convert("L"), lambda v: v // 6).convert("RGB").save(f"{OUT}/desk_mat.jpg", quality=85)

def label(name, size, bg, lines):
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    y = size[1] * 0.3
    for text, font, px_, col in lines:
        f = ImageFont.truetype(font, px_)
        w = d.textlength(text, font=f)
        d.text(((size[0] - w) / 2, y), text, font=f, fill=col)
        y += px_ * 1.35
    im.save(f"{OUT}/{name}.png")

def whey_label():
    """Wraps once around the tub; the front (u = 0.75) faces the camera."""
    w, h = 2048, 640
    im = Image.new("RGB", (w, h), (14, 14, 16))
    d = ImageDraw.Draw(im)
    cx = int(w * 0.75)
    d.rectangle([0, 40, w, 52], fill=(201, 160, 72)); d.rectangle([0, h - 52, w, h - 40], fill=(201, 160, 72))
    d.polygon([(cx - 330, 470), (cx + 330, 400), (cx + 330, 480), (cx - 330, 550)], fill=(110, 62, 34))  # flavour ribbon
    for text, font, size, y, col in [("100%", BOLD, 92, 90, (230, 190, 95)), ("WHEY", BOLD, 150, 175, (240, 205, 110)),
                                      ("PROTEIN", BOLD, 64, 330, (245, 245, 245)), ("DOUBLE CHOCOLATE", BOLD, 34, 470, (250, 236, 210)),
                                      ("24 g protein  ·  5 lb", REG, 30, 575, (200, 200, 200))]:
        f = ImageFont.truetype(font, size)
        d.text((cx - d.textlength(text, font=f) / 2, y), text, font=f, fill=col)
    for x in (int(w * 0.25),):  # nutrition panel on the back
        f = ImageFont.truetype(REG, 26)
        for i, t in enumerate(["Nutrition facts", "Serving 30 g", "Protein 24 g", "Carbs 3 g", "Fat 1.5 g"]):
            d.text((x - 120, 140 + i * 44), t, font=f, fill=(190, 190, 190))
    im.save(f"{OUT}/whey_label.png")

def paw_bag():
    im = Image.new("RGB", (512, 512), (116, 196, 186))
    d = ImageDraw.Draw(im)
    for i, (x, y) in enumerate((x, y) for y in range(40, 512, 110) for x in range(40 + (y // 110 % 2) * 55, 512, 110)):
        d.ellipse([x - 16, y - 12, x + 16, y + 16], fill=(245, 250, 250))
        for dx, dy in ((-18, -22), (-6, -30), (6, -30), (18, -22)):
            d.ellipse([x + dx - 6, y + dy - 6, x + dx + 6, y + dy + 6], fill=(245, 250, 250))
    im.save(f"{OUT}/paw_bag.png")

def lanyard_cards():
    for key, org, role, col in [("fraunhofer", "FRAUNHOFER IEM", "Research Assistant", (23, 156, 125)),
                                ("gdg", "GDG PADERBORN", "Team member", (66, 133, 244)),
                                ("isg", "ISG PADERBORN", "Volunteer", (217, 115, 38)),
                                ("asv", "ASV PADERBORN", "Volunteer", (191, 38, 51))]:
        im = Image.new("RGB", (360, 504), (242, 239, 232))
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 360, 120], fill=col)
        d.rounded_rectangle([150, 22, 210, 34], 6, fill=(242, 239, 232))  # slot for the clip
        for text, font, size, y in [(org, BOLD, 30, 210), (role, REG, 26, 270), ("Deepesh Yadav", BOLD, 26, 400)]:
            f = ImageFont.truetype(font, size)
            d.text(((360 - d.textlength(text, font=f)) / 2, y), text, font=f, fill=(29, 37, 46))
        im.save(f"{OUT}/card_{key}.png")

def checkerboard():
    im = Image.new("RGB", (512, 512))
    d = ImageDraw.Draw(im)
    for r in range(8):
        for c in range(8):
            d.rectangle([c * 64, r * 64, c * 64 + 63, r * 64 + 63], fill=(214, 186, 140) if (r + c) % 2 == 0 else (110, 66, 36))
    im.save(f"{OUT}/checker.png")

world_map()
checkerboard()
whey_label()
paw_bag()
lanyard_cards()
print("textures written to", OUT)

def maxel():
    """Recolour kenchoo's black-and-white bull terrier into Maxel: brown coat, white chest."""
    import numpy as np
    src = f"{HERE}/assets/bull_terrier/orig"
    for n in ("Material4", "Material5", "Material6"):  # head, body, legs (1 = eyes, 2 = mouth stay)
        im = np.asarray(Image.open(f"{src}/{n}-material_baseColor.png").convert("RGBA")).astype(np.float32) / 255
        rgb, lum = im[..., :3], im[..., :3].mean(axis=2)
        dark = lum < 0.33
        if n == "Material4":  # keep the nose dark
            h, w = lum.shape
            dark[int(h * 0.55):int(h * 0.75), int(w * 0.4):int(w * 0.6)] = False
        brown = np.array([0.6, 0.34, 0.17]) * (0.45 + lum[..., None] * 2.0)
        rgb[dark] = brown[dark]
        Image.fromarray((np.clip(im, 0, 1) * 255).astype(np.uint8)).save(f"{HERE}/assets/bull_terrier/textures/{n}-material_baseColor.png")

maxel()
print("maxel recoloured")
