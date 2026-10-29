# Step 2: detailed room built on the step 1 layout (same positions as blockout.py).
# X right, Y into the wall, Z up; back wall at y=0, metres.
# Run: blender -b -P blender/scene.py -- <out_dir> [mood ...]
import bpy, bmesh, sys, json, math, os, random
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:]
OUT, MOODS = args[0], args[1:] or ["golden", "night"]
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# ---------- materials ----------
def mat(name, color, rough=0.5, metal=0.0, emit=None, strength=1.0, tex=None, bump=None, clearcoat=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1) if len(color) == 3 else color
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    p.inputs["Coat Weight"].default_value = clearcoat
    if tex:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(f"{HERE}/tex/{tex}")
        nt.links.new(t.outputs["Color"], p.inputs["Base Color"])
        if emit == "tex":
            nt.links.new(t.outputs["Color"], p.inputs["Emission Color"])
    if emit and emit != "tex":
        p.inputs["Emission Color"].default_value = (*emit, 1)
    if emit:
        p.inputs["Emission Strength"].default_value = strength
    if bump:  # fine noise bump: plaster, cork, fabric
        n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = bump[0]; n.inputs["Detail"].default_value = 8
        b = nt.nodes.new("ShaderNodeBump"); b.inputs["Strength"].default_value = bump[1]
        nt.links.new(n.outputs["Fac"], b.inputs["Height"]); nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    return m

def wood(name, base, dark, scale=(1, 18, 1)):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    p = nt.nodes["Principled BSDF"]; p.inputs["Roughness"].default_value = 0.55
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = scale
    w = nt.nodes.new("ShaderNodeTexWave"); w.inputs["Scale"].default_value = 3; w.inputs["Distortion"].default_value = 6; w.inputs["Detail"].default_value = 4
    r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].color = (*dark, 1); r.color_ramp.elements[1].color = (*base, 1)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], w.inputs["Vector"])
    nt.links.new(w.outputs["Fac"], r.inputs["Fac"]); nt.links.new(r.outputs["Color"], p.inputs["Base Color"])
    return m

def floor_mat():
    m = bpy.data.materials.new("floor"); m.use_nodes = True; nt = m.node_tree
    p = nt.nodes["Principled BSDF"]; p.inputs["Roughness"].default_value = 0.35
    b = nt.nodes.new("ShaderNodeTexBrick")  # long planks
    b.inputs["Color1"].default_value = (0.16, 0.085, 0.05, 1); b.inputs["Color2"].default_value = (0.21, 0.12, 0.07, 1)
    b.inputs["Mortar"].default_value = (0.07, 0.04, 0.025, 1); b.inputs["Scale"].default_value = 1.2
    b.inputs["Mortar Size"].default_value = 0.004; b.inputs["Brick Width"].default_value = 1.6; b.inputs["Row Height"].default_value = 0.16
    b.offset = 0.37
    nt.links.new(b.outputs["Color"], p.inputs["Base Color"])
    return m

WALL = mat("wall", (0.80, 0.77, 0.71), 0.92, bump=(260, 0.04))
WHITE = mat("white", (0.86, 0.86, 0.84), 0.45)
LEG = mat("leg", (0.55, 0.56, 0.58), 0.35, 0.8)
BLACK = mat("black", (0.025, 0.025, 0.028), 0.4)
MATTE = mat("matte_black", (0.03, 0.03, 0.035), 0.75)
ALU = mat("alu", (0.6, 0.6, 0.62), 0.3, 1.0)
OAK = wood("oak", (0.72, 0.56, 0.38), (0.6, 0.45, 0.29))
SCREEN = mat("screen", (0.01, 0.015, 0.03), 0.15, emit=(0.02, 0.06, 0.25), strength=1.2)
CERAMIC = mat("ceramic", (0.88, 0.88, 0.86), 0.3)
TERRACOTTA = mat("terracotta", (0.55, 0.24, 0.13), 0.8)
TIN = mat("tin", (0.62, 0.63, 0.64), 0.35, 1.0)
LEAF = mat("leaf", (0.07, 0.24, 0.05), 0.45)
SHADE = mat("shade", (0.92, 0.9, 0.86), 0.6, emit=(1.0, 0.78, 0.5), strength=0.0)

# ---------- mesh helpers ----------
def obj(name, mesh_fn, loc=(0, 0, 0), rot=(0, 0, 0), material=None, bevel=0.0, smooth=False):
    mesh_fn(location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if material:
        o.data.materials.append(material)
    if bevel:
        o.modifiers.new("bevel", "BEVEL").width = bevel
        o.modifiers["bevel"].segments = 3
    if smooth:
        bpy.ops.object.shade_smooth()
    return o

def box(name, size, loc, material, rot=(0, 0, 0), bevel=0.003):
    o = obj(name, bpy.ops.mesh.primitive_cube_add, loc, rot, material, bevel)
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if any(n.type == "TEX_IMAGE" for n in material.node_tree.nodes):
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.reset(); bpy.ops.object.mode_set(mode="OBJECT")
    return o

def decal(name, w, h, loc, material, rot=(math.radians(90), 0, 0)):
    """Plane with the full image, upright and facing -Y (or flat on the desk with rot=(0,0,0))."""
    o = obj(name, lambda **k: bpy.ops.mesh.primitive_plane_add(size=1, **k), loc, rot, material)
    o.scale = (w, h, 1)
    return o

def cyl(name, r, h, loc, material, rot=(0, 0, 0), verts=40, bevel=0.002):
    o = obj(name, lambda **k: bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, **k), loc, rot, material, bevel, smooth=True)
    return o

def from_pydata(name, verts, faces, material, loc=(0, 0, 0), smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    o.location = loc
    col.objects.link(o)
    o.data.materials.append(material)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return o

def lathe(name, profile, loc, material, segs=32):
    """Spin a (radius, z) profile around Z."""
    verts = [(r * math.cos(2 * math.pi * s / segs), r * math.sin(2 * math.pi * s / segs), z) for s in range(segs) for r, z in profile]
    n = len(profile)
    faces = [(s * n + i, ((s + 1) % segs) * n + i, ((s + 1) % segs) * n + i + 1, s * n + i + 1) for s in range(segs) for i in range(n - 1)]
    o = from_pydata(name, verts, faces, material, loc)
    uv = o.data.uv_layers.new()
    for f, poly in enumerate(o.data.polygons):
        s_, i = divmod(f, n - 1)
        for loop, (du, dv) in zip(poly.loop_indices, ((0, 0), (1, 0), (1, 1), (0, 1))):
            uv.data[loop].uv = ((s_ + du) / segs, (i + dv) / (n - 1))
    return o

def ribbon(name, centre, widths, normal_fn, material):
    """Strip along a centre polyline; width per point; normal_fn(i) gives the side vector."""
    verts, faces = [], []
    for i, (c, w) in enumerate(zip(centre, widths)):
        side = normal_fn(i) * (w / 2)
        verts += [tuple(c - side), tuple(c + side)]
        if i:
            faces.append((2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i))
    o = from_pydata(name, verts, faces, material)
    o.modifiers.new("solid", "SOLIDIFY").thickness = 0.0015
    return o

# ---------- room ----------
box("wall", (9, 0.04, 3.2), (0, 0.02, 1.6), WALL, bevel=0)
f = box("floor", (9, 5, 0.02), (0, -2.5, -0.01), floor_mat(), bevel=0)
box("skirting", (9, 0.015, 0.07), (0, -0.008, 0.035), WHITE)
# left wall with a window: shapes the sunlight patches, out of shot in the home view
WX = -2.3
for nm, size, loc in [("lwall_low", (0.04, 5, 0.9), (WX, -2.5, 0.45)), ("lwall_high", (0.04, 5, 0.8), (WX, -2.5, 2.8)),
                      ("lwall_back", (0.04, 0.9, 1.5), (WX, -0.45, 1.65)), ("lwall_front", (0.04, 3.1, 1.5), (WX, -3.45, 1.65))]:
    box(nm, size, loc, WALL, bevel=0)

# ---------- desk ----------
TOP = 0.75
box("desk_top", (1.45, 0.62, 0.025), (0.1, -0.31, TOP - 0.0125), WHITE, bevel=0.004)
for x in (-0.6, 0.8):
    for y in (-0.04, -0.58):
        box("desk_leg", (0.035, 0.035, TOP - 0.025), (x, y, (TOP - 0.025) / 2), LEG)
    box("desk_rail", (0.02, 0.5, 0.03), (x, -0.31, 0.06), LEG)
decal("desk_mat", 0.85, 0.32, (0.05, -0.42, TOP + 0.0015), mat("deskmat", (0.05, 0.05, 0.05), 0.9, tex="desk_mat.jpg"), rot=(0, 0, 0))

# monitor (27", Samsung style: thin bezel, round base)
box("monitor_back", (0.62, 0.03, 0.37), (0.0, -0.11, TOP + 0.33), MATTE, bevel=0.006)
box("monitor_screen", (0.605, 0.002, 0.345), (0.0, -0.126, TOP + 0.335), SCREEN, bevel=0)
box("monitor_neck", (0.035, 0.02, 0.16), (0.0, -0.09, TOP + 0.09), MATTE)
cyl("monitor_base", 0.11, 0.012, (0.0, -0.13, TOP + 0.006), MATTE, verts=64)

# laptop (red-backlit gaming laptop) on an aluminium stand
TILT = math.radians(-14)
for dx in (-0.1, 0.1):
    box("laptop_stand_arm", (0.02, 0.2, 0.012), (0.6 + dx, -0.2, TOP + 0.07), ALU, rot=(TILT, 0, 0))
    box("laptop_stand_post", (0.02, 0.015, 0.12), (0.6 + dx, -0.12, TOP + 0.06), ALU)
box("laptop_stand_foot", (0.25, 0.2, 0.008), (0.6, -0.2, TOP + 0.004), ALU)
box("laptop_base", (0.36, 0.25, 0.022), (0.6, -0.22, TOP + 0.1), BLACK, rot=(TILT, 0, 0))
box("laptop_keys", (0.31, 0.11, 0.002), (0.6, -0.245, TOP + 0.107), mat("red_glow", (0.05, 0, 0), 0.5, emit=(1, 0.05, 0.03), strength=3), rot=(TILT, 0, 0), bevel=0)
box("laptop_lid", (0.36, 0.012, 0.24), (0.6, -0.085, TOP + 0.25), BLACK, rot=(math.radians(-10), 0, 0))
box("laptop_screen", (0.33, 0.002, 0.2), (0.6, -0.092, TOP + 0.252), SCREEN, rot=(math.radians(-10), 0, 0), bevel=0)

# keyboard with green underglow, mouse, phone
box("keyboard", (0.44, 0.14, 0.018), (0.12, -0.44, TOP + 0.009), BLACK, bevel=0.004)
box("keyboard_glow", (0.42, 0.12, 0.002), (0.12, -0.44, TOP + 0.019), mat("green_glow", (0.1, 0.3, 0), 0.5, emit=(0.55, 1.0, 0.15), strength=2.5), bevel=0)
for r in range(5):
    for c in range(18):
        box("key", (0.019, 0.019, 0.008), (0.12 - 0.2 + c * 0.0235, -0.49 + r * 0.023, TOP + 0.022), BLACK, bevel=0.002)
m = obj("mouse", bpy.ops.mesh.primitive_uv_sphere_add, (0.47, -0.44, TOP + 0.012), material=BLACK, smooth=True)
m.scale = (0.032, 0.062, 0.022)
box("mouse_logo", (0.012, 0.012, 0.001), (0.47, -0.415, TOP + 0.033), mat("razer", (0, 0.2, 0), emit=(0.2, 1, 0.3), strength=4), bevel=0)
box("phone", (0.075, 0.158, 0.008), (0.61, -0.45, TOP + 0.004), BLACK, rot=(0, 0, math.radians(-8)), bevel=0.006)
box("phone_screen", (0.068, 0.15, 0.001), (0.61, -0.45, TOP + 0.0085), SCREEN, rot=(0, 0, math.radians(-8)), bevel=0)

# tablet with headphones lying on it (left of the keyboard)
box("tablet", (0.28, 0.2, 0.007), (-0.36, -0.37, TOP + 0.0035), mat("navy", (0.03, 0.04, 0.09), 0.4), rot=(0, 0, math.radians(4)), bevel=0.004)
band = obj("headphone_band", lambda **k: bpy.ops.mesh.primitive_torus_add(major_radius=0.075, minor_radius=0.009, **k),
           (-0.36, -0.36, TOP + 0.03), (0, 0, 0), MATTE, smooth=True)
band.scale = (1, 0.8, 1)
for dx in (-0.075, 0.075):
    cyl("headphone_cup", 0.035, 0.03, (-0.36 + dx, -0.36, TOP + 0.022), MATTE)

# ---------- floor lamp with two bowl shades ----------
LX, LY = -0.74, -0.15
cyl("lamp_base", 0.13, 0.02, (LX, LY, 0.01), WHITE, verts=64)
cyl("lamp_pole", 0.011, 1.75, (LX, LY, 0.875), WHITE)
for nm, loc, tilt in [("lamp_shade_top", (-0.64, -0.17, 1.62), -35), ("lamp_shade_low", (-0.85, -0.2, 1.38), 35)]:
    s = lathe(nm, [(0.02, -0.07), (0.07, -0.065), (0.1, -0.03), (0.115, 0.03), (0.118, 0.07)], loc, SHADE, 48)
    s.rotation_euler = (math.radians(15), math.radians(tilt), 0)
    s.modifiers.new("solid", "SOLIDIFY").thickness = 0.004
    box(nm + "_arm", (abs(loc[0] - LX), 0.012, 0.012), ((loc[0] + LX) / 2, LY, loc[2] - 0.06), WHITE)

# side table with dried flowers
box("side_table", (0.38, 0.38, 0.5), (-1.15, -0.3, 0.25), WHITE)
lathe("flower_pot", [(0.0, 0), (0.06, 0), (0.075, 0.05), (0.08, 0.13), (0.075, 0.14)], (-1.15, -0.3, 0.5), CERAMIC)
for i in range(60):
    a, r = random.uniform(0, 6.28), random.uniform(0, 0.11)
    s = obj("dried_flower", lambda **k: bpy.ops.mesh.primitive_ico_sphere_add(radius=0.012, subdivisions=1, **k),
            (-1.15 + r * math.cos(a), -0.3 + r * math.sin(a), 0.68 + random.uniform(0, 0.14) - r * 0.4), material=mat("dried", (0.75, 0.62, 0.42), 0.8))

# ---------- wall shelf ----------
SX0, CW, SB, SH, SD = -0.25, 0.4, 1.40, 0.42, 0.3
box("shelf_bottom", (3 * CW + 0.018, SD, 0.018), (SX0 + 1.5 * CW, -SD / 2, SB), OAK)
box("shelf_top", (3 * CW + 0.018, SD, 0.018), (SX0 + 1.5 * CW, -SD / 2, SB + SH), OAK)
for i in range(4):
    box("shelf_side", (0.018, SD, SH), (SX0 + i * CW, -SD / 2, SB + SH / 2), OAK)
# cube 1: whey tub + dumbbell
# 5 lb gym tub: rounded body, ribbed screw lid, black and gold wrap label
WX_, WZ_ = SX0 + 0.125, SB + 0.009
GLOSS = mat("gloss_black", (0.02, 0.02, 0.022), 0.18, clearcoat=0.6)
lathe("whey_tub", [(0.0, 0), (0.066, 0), (0.072, 0.008), (0.074, 0.03), (0.074, 0.19), (0.07, 0.205), (0.06, 0.212)], (WX_, -0.15, WZ_), GLOSS, 48)
lathe("whey_label", [(0.0745, 0.035), (0.0745, 0.185)], (WX_, -0.15, WZ_), mat("whey", (1, 1, 1), 0.3, tex="whey_label.png", clearcoat=0.4), 48)
lathe("whey_lid", [(0.0, 0.25), (0.062, 0.25), (0.064, 0.246)] + [(0.064 + 0.0015 * (k % 2), 0.244 - k * 0.0035) for k in range(10)] + [(0.06, 0.208)],
      (WX_, -0.15, WZ_), GLOSS, 48)
lathe("whey_lid_ring", [(0.064, 0.246), (0.066, 0.243)], (WX_, -0.15, WZ_), mat("gold", (0.75, 0.55, 0.2), 0.3, 1.0), 48)
cyl("dumbbell_bar", 0.012, 0.2, (SX0 + 0.29, -0.16, SB + 0.045), TIN, rot=(0, math.radians(90), 0))
for dx in (-0.065, 0.065):
    cyl("dumbbell_plate", 0.038, 0.045, (SX0 + 0.29 + dx, -0.16, SB + 0.047), MATTE, rot=(0, math.radians(90), 0), verts=6)
# cube 2: books
for i, c in enumerate([(0.12, 0.2, 0.35), (0.55, 0.15, 0.12), (0.8, 0.75, 0.68), (0.18, 0.3, 0.2), (0.45, 0.35, 0.55)]):
    h = 0.22 + 0.025 * (i % 3)
    box("book", (0.032, 0.2, h), (SX0 + CW + 0.11 + 0.036 * i, -0.13, SB + 0.009 + h / 2), mat(f"book{i}", c, 0.6), bevel=0.003)
box("book_leaning", (0.03, 0.2, 0.24), (SX0 + CW + 0.32, -0.13, SB + 0.115), mat("book5", (0.7, 0.55, 0.2), 0.6), rot=(0, math.radians(-15), 0))
# cube 3: the chessboard (built below)

# ---------- plants on top of the shelf ----------
TOPZ = SB + SH + 0.009

def import_gltf(path, loc, scale, rot_z=0.0, height=None):
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = set(scene.objects) - before
    root = bpy.data.objects.new(os.path.basename(path), None)
    col.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    if height:
        bpy.context.view_layer.update()
        zs = [(o.matrix_world @ Vector(c)).z for o in new if o.type == "MESH" for c in o.bound_box]
        scale = height / (max(zs) - min(zs))
    root.location, root.scale, root.rotation_euler = loc, (scale,) * 3, (0, 0, rot_z)
    return root, new

# leaves are batched into one mesh per plant (fewer objects for the web export)
class Leaves:
    def __init__(self):
        self.verts, self.faces = [], []

    def add(self, outline, base, direction, size, fold=0.25, up=Vector((0, 0, 1))):
        """outline: (x, y) points of a leaf pointing +y from its base; fan-triangulated from the centre."""
        y = direction.normalized()
        x = y.cross(up).normalized() if abs(y.dot(up)) < 0.98 else Vector((1, 0, 0))
        z = x.cross(y)
        cx = sum(p[0] for p in outline) / len(outline); cy = sum(p[1] for p in outline) / len(outline)
        start = len(self.verts)
        for px_, py_ in [(cx, cy)] + outline:
            self.verts.append(tuple(base + (x * px_ + y * py_ + z * (fold * abs(px_) - 0.06 * py_ * py_)) * size))
        k = len(outline)
        self.faces += [(start, start + 1 + i, start + 1 + (i + 1) % k) for i in range(k)]

    def build(self, name, material):
        return from_pydata(name, self.verts, self.faces, material)

HEART = [(math.sin(t) ** 3 * 0.75, (-(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) + 5) / 22)
         for t in [i / 24 * math.pi * 2 for i in range(24)]]
OVAL = [(0.32 * math.sin(t), (1 - math.cos(t)) / 2) for t in [i / 10 * math.pi for i in range(11)]] + \
       [(-0.32 * math.sin(t), (1 + math.cos(t)) / 2) for t in [i / 10 * math.pi for i in range(1, 10)]]

def stem(name, pts, radius, material):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = radius; cu.bevel_resolution = 2
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p_, v in zip(sp.points, pts):
        p_.co = (*v, 1)
    o = bpy.data.objects.new(name, cu); col.objects.link(o); o.data.materials.append(material)
    return o

def variegated(name, green, cream):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    p = nt.nodes["Principled BSDF"]; p.inputs["Roughness"].default_value = 0.4; p.inputs["Coat Weight"].default_value = 0.2
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = 60; n.inputs["Detail"].default_value = 3
    r = nt.nodes.new("ShaderNodeValToRGB"); r.color_ramp.elements[0].position = 0.55; r.color_ramp.elements[1].position = 0.7
    r.color_ramp.elements[0].color = (*green, 1); r.color_ramp.elements[1].color = (*cream, 1)
    nt.links.new(n.outputs["Fac"], r.inputs["Fac"]); nt.links.new(r.outputs["Color"], p.inputs["Base Color"])
    return m

POTHOS = variegated("pothos_leaf", (0.06, 0.22, 0.04), (0.45, 0.5, 0.15))
STEM = mat("stem", (0.18, 0.3, 0.08), 0.6)

# money plant (pothos): bushy crown in a terracotta pot, plus the long vine down to the lamp
MPX = -0.15
lathe("money_pot", [(0.0, 0.0), (0.05, 0.0), (0.06, 0.01), (0.072, 0.11), (0.08, 0.115), (0.08, 0.13), (0.07, 0.13), (0.068, 0.12)], (MPX, -0.15, TOPZ), TERRACOTTA)
cyl("money_soil", 0.067, 0.004, (MPX, -0.15, TOPZ + 0.118), mat("soil", (0.08, 0.05, 0.03), 0.95))
pothos = Leaves()
crown = Vector((MPX, -0.15, TOPZ + 0.12))
for i in range(16):
    a = i / 16 * 6.28 + random.uniform(-0.2, 0.2)
    out = Vector((math.cos(a), math.sin(a) * 0.7, 0))
    L, h = random.uniform(0.12, 0.26), random.uniform(0.08, 0.2)
    pts = [crown + out * (L * t) + Vector((0, 0, h * math.sin(math.pi * t * 0.75) - 0.05 * t * t)) for t in [k / 8 for k in range(9)]]
    stem("pothos_stem", pts, 0.0025, STEM)
    for k in range(2, 9, 2):
        tangent = (pts[min(k + 1, 8)] - pts[k - 1]).normalized()
        side = out.cross(Vector((0, 0, 1))) * (1 if k % 4 else -1)
        pothos.add(HEART, pts[k], (tangent + side * 0.6 + Vector((0, 0, 0.5))), random.uniform(0.06, 0.09))
vine = [Vector((MPX - 0.06 - 0.6 * t, -0.05 + 0.02 * math.sin(t * 9), TOPZ + 0.1 - 0.9 * t + 0.18 * math.sin(t * 3.1))) for t in [i / 40 for i in range(41)]]
stem("vine_stem", vine, 0.002, STEM)
for i in range(1, 41, 2):
    side = Vector((0, -1, 0)) + Vector((random.uniform(-0.5, 0.5), 0, random.uniform(-0.3, 0.6)))
    pothos.add(HEART, vine[i], side, random.uniform(0.045, 0.065), up=Vector((1, 0, 0)))
pothos.build("pothos_leaves", POTHOS)

# middle plant: thin woody branches with small oval leaves, in a white ribbed pot
MMX = 0.17
lathe("middle_pot", [(0.0, 0.0), (0.055, 0.0)] + [(0.07 + 0.003 * (k % 2), 0.01 + k * 0.009) for k in range(14)] + [(0.068, 0.135)],
      (MMX, -0.15, TOPZ), CERAMIC, 64)
cyl("middle_soil", 0.066, 0.004, (MMX, -0.15, TOPZ + 0.125), mat("soil", (0.08, 0.05, 0.03), 0.95))
small = Leaves()
BARK = mat("bark", (0.22, 0.17, 0.1), 0.7)

def branch(start, d, length, depth):
    end = start + d * length
    mid = (start + end) / 2 + Vector((random.uniform(-0.01, 0.01), random.uniform(-0.01, 0.01), 0))
    stem("middle_branch", [start, mid, end], 0.0012 + 0.0012 * depth, BARK)
    for k in range(5 if depth else 12):
        t = random.uniform(0.3, 1.0)
        p_ = start + (end - start) * t
        small.add(OVAL, p_, d + Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(-0.2, 0.8))), random.uniform(0.018, 0.03), fold=0.15)
    if depth:
        for _ in range(random.choice((2, 3))):
            nd = (d + Vector((random.uniform(-0.7, 0.7), random.uniform(-0.4, 0.4), random.uniform(0.0, 0.4)))).normalized()
            branch(end, nd, length * random.uniform(0.6, 0.8), depth - 1)

for _ in range(5):
    branch(Vector((MMX + random.uniform(-0.02, 0.02), -0.15 + random.uniform(-0.02, 0.02), TOPZ + 0.125)),
           Vector((random.uniform(-0.25, 0.25), random.uniform(-0.15, 0.15), 1)).normalized(), random.uniform(0.12, 0.18), 3)
small.build("middle_leaves", mat("small_leaf", (0.09, 0.26, 0.05), 0.45))

# spider plant in a tin bucket
SPX = 0.47
lathe("spider_pot", [(0.0, 0), (0.06, 0), (0.065, 0.005), (0.075, 0.12), (0.078, 0.125)], (SPX, -0.15, TOPZ), TIN)
SPIDER = mat("spider_leaf", (0.15, 0.36, 0.08), 0.5)
for i in range(46):
    a = i / 46 * 6.28 + random.uniform(-0.1, 0.1)
    L, rise = random.uniform(0.22, 0.45), random.uniform(0.1, 0.24)
    d = Vector((math.cos(a) * (0.75 if math.cos(a) > 0 else 1), math.sin(a) * 0.6, 0))  # leans away from the globe
    pts = [Vector((SPX, -0.15, TOPZ + 0.12)) + d * (L * t) + Vector((0, 0, rise * math.sin(math.pi * t * 0.8) - 0.12 * t * t))
           for t in [k / 10 for k in range(11)]]
    ribbon("spider_leaf", pts, [0.012 * (1 - k / 11) + 0.002 for k in range(11)], lambda k, d=d: Vector((-d.y, d.x, 0)), SPIDER)

# ---------- desk globe at the right end of the shelf (spins in the browser) ----------
GX, GR = 0.83, 0.1
BRASS = mat("brass", (0.78, 0.58, 0.25), 0.28, 1.0)
lathe("globe_base", [(0.0, 0.0), (0.07, 0.0), (0.072, 0.008), (0.06, 0.02), (0.02, 0.03), (0.012, 0.05), (0.0, 0.05)], (GX, -0.15, TOPZ), wood("globe_wood", (0.3, 0.16, 0.07), (0.2, 0.1, 0.04)))
GC = Vector((GX, -0.15, TOPZ + 0.05 + GR + 0.025))
tilt = math.radians(23.4)
arc = obj("globe_meridian", lambda **k: bpy.ops.mesh.primitive_torus_add(major_radius=GR + 0.012, minor_radius=0.003, major_segments=64, **k),
          tuple(GC), (math.radians(90), tilt, 0), BRASS, smooth=True)
globe = obj("globe", lambda **k: bpy.ops.mesh.primitive_uv_sphere_add(radius=GR, segments=64, ring_count=32, **k), tuple(GC), (0, tilt, 0),
            mat("globe_map", (1, 1, 1), 0.35, tex="globe.jpg", clearcoat=0.5), smooth=True)
globe.rotation_mode = "XYZ"
globe.rotation_euler = (0, tilt, math.radians(-100))  # Europe and India face the room
cyl("globe_axis", 0.003, 2 * GR + 0.05, tuple(GC), BRASS, rot=(0, tilt, 0))
cyl("globe_post", 0.006, 0.04, (GX, -0.15, TOPZ + 0.06), BRASS)

# ---------- vertical chessboard (Julia style), standing in the right shelf cube ----------
CS = 0.3
CX, CZ, Y0 = SX0 + 2.5 * CW, SB + 0.009 + (CS + 0.03) / 2, -0.07  # Y0: how far in front of the wall the board stands
box("chess_frame", (CS + 0.03, 0.025, CS + 0.03), (CX, Y0 - 0.0125, CZ), wood("chess_wood", (0.35, 0.2, 0.1), (0.25, 0.13, 0.06)))
# image texture, not a procedural checker: procedural coordinates break when bake.py merges the meshes
board = decal("chessboard", CS, CS, (CX, Y0 - 0.026, CZ), mat("checker", (1, 1, 1), 0.5, tex="checker.png"))
PIECES = {"p": [(0.011, 0), (0.011, 0.004), (0.006, 0.01), (0.004, 0.02), (0.007, 0.026), (0.0, 0.032)],
          "r": [(0.012, 0), (0.012, 0.005), (0.008, 0.01), (0.008, 0.028), (0.011, 0.03), (0.011, 0.037), (0.0, 0.037)],
          "n": [(0.012, 0), (0.012, 0.005), (0.007, 0.012), (0.009, 0.03), (0.004, 0.04), (0.0, 0.041)],
          "b": [(0.012, 0), (0.012, 0.005), (0.006, 0.012), (0.004, 0.03), (0.008, 0.036), (0.002, 0.045), (0.0, 0.046)],
          "q": [(0.013, 0), (0.013, 0.005), (0.007, 0.012), (0.005, 0.036), (0.01, 0.044), (0.004, 0.05), (0.0, 0.051)],
          "k": [(0.013, 0), (0.013, 0.005), (0.007, 0.012), (0.005, 0.038), (0.009, 0.046), (0.003, 0.052), (0.003, 0.058), (0.0, 0.059)]}
POSITION = ["r...k..r", "ppp..ppp", "..n.bn..", "...pp...", "...PP...", "..N..N..", "PPP.BPPP", "R..QK..R"]  # an Italian-game middlegame
LIGHT, DARK = mat("piece_light", (0.85, 0.8, 0.7), 0.35), mat("piece_dark", (0.05, 0.04, 0.04), 0.35)
sq = CS / 8
for r, row in enumerate(POSITION):
    for c, p in enumerate(row):
        if p == ".":
            continue
        pz = CZ + CS / 2 - (r + 1) * sq + 0.002  # sits on a small ledge at the bottom of its square
        box("chess_ledge", (sq * 0.8, 0.012, 0.002), (CX - CS / 2 + (c + 0.5) * sq, Y0 - 0.033, pz - 0.001), mat("ledge", (0.25, 0.13, 0.06), 0.5), bevel=0)
        lathe("chess_piece", [(a * 0.6, b * 0.6) for a, b in PIECES[p.lower()]], (CX - CS / 2 + (c + 0.5) * sq, Y0 - 0.037, pz), LIGHT if p.isupper() else DARK, 20)

# ---------- cork story board with the company lanyards ----------
BX, BZ = 1.45, 1.5
box("story_frame", (0.73, 0.03, 0.58), (BX, -0.015, BZ), OAK)
box("story_board", (0.69, 0.004, 0.54), (BX, -0.031, BZ), mat("cork", (0.6, 0.42, 0.25), 0.9, bump=(400, 0.35)), bevel=0)
for i, (key, colr) in enumerate([("fraunhofer", (0.09, 0.61, 0.49)), ("gdg", (0.26, 0.52, 0.96)), ("isg", (0.85, 0.45, 0.15)), ("asv", (0.75, 0.15, 0.2))]):
    x = 1.2 + 0.165 * i
    pin = Vector((x, -0.04, 1.72))
    obj("story_pin", lambda **k: bpy.ops.mesh.primitive_uv_sphere_add(radius=0.009, **k), tuple(pin), material=mat("pin", (0.8, 0.08, 0.08), 0.3), smooth=True)
    # the straps and cards are drawn live in the browser (src/Lanyards.tsx) so they can swing

# ---------- Maxel: kenchoo's CC-BY bull terrier, textures recoloured by textures.py ----------
maxel, parts = import_gltf(f"{HERE}/assets/bull_terrier/scene.gltf", (1.2, -0.45, 0), 1.5, math.radians(-25))
bpy.data.objects.remove(bpy.data.objects["Icosphere"])

# ---------- lights and moods ----------
world = bpy.data.worlds.new("world"); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sun_d = Vector((0.8, 0.35, -0.5)).normalized()
bpy.ops.object.light_add(type="SUN"); sun = bpy.context.object; sun.name = "sun"
sun.rotation_euler = sun_d.to_track_quat("-Z", "Y").to_euler(); sun.data.angle = math.radians(1.5)
lamp_lights = []
for nm in ("lamp_shade_top", "lamp_shade_low"):
    s = bpy.data.objects[nm]
    bpy.ops.object.light_add(type="POINT", location=s.location + s.matrix_world.to_3x3() @ Vector((0, 0, 0.01)))
    l = bpy.context.object; l.data.shadow_soft_size = 0.04; l.data.color = (1.0, 0.72, 0.42); lamp_lights.append(l)
bpy.ops.object.light_add(type="AREA", location=(0.1, -2.6, 2.4)); fill = bpy.context.object; fill.name = "room_fill"
fill.data.size = 3; fill.rotation_euler = (math.radians(55), 0, 0)

MOOD = {  # sun strength, sun colour, sky colour, sky strength, lamp W, shade glow, fill W
    "golden":    (3.0, (1.0, 0.62, 0.32), (0.55, 0.42, 0.35), 0.35, 0, 0, 40),
    "afternoon": (4.5, (1.0, 0.93, 0.85), (0.6, 0.7, 0.85), 0.6, 0, 0, 60),
    "overcast":  (0.0, (1, 1, 1), (0.7, 0.74, 0.8), 1.0, 0, 0, 120),
    "evening":   (0.6, (1.0, 0.45, 0.3), (0.25, 0.25, 0.45), 0.25, 25, 1.5, 15),
    "night":     (0.0, (1, 1, 1), (0.03, 0.04, 0.09), 0.3, 35, 2.5, 4),
}

def set_mood(name):
    s, sc, sky, sky_s, lamp_w, glow, fill_w = MOOD[name]
    sun.data.energy, sun.data.color = s, sc
    bg.inputs["Color"].default_value, bg.inputs["Strength"].default_value = (*sky, 1), sky_s
    for l in lamp_lights:
        l.data.energy = lamp_w
    SHADE.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = glow
    fill.data.energy = fill_w

# ---------- cameras ----------
def camera(name, loc, target, fov):
    bpy.ops.object.camera_add(location=loc)
    c = bpy.context.object; c.name = name
    c.data.sensor_fit, c.data.angle_y = "VERTICAL", math.radians(fov)
    c.rotation_euler = (Vector(target) - c.location).to_track_quat("-Z", "Y").to_euler()
    return c

cams = {"home": camera("cam_home", (0.12, -2.7, 1.27), (0.12, 0, 1.17), 50),
        "shelf": camera("cam_shelf", (0.3, -1.3, 1.95), (0.3, 0, 1.78), 40),
        "room": camera("cam_room", (0.15, -3.55, 1.4), (0.15, 0, 1.32), 49)}

r = scene.render
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = int(os.environ.get("SAMPLES", 96))
scene.cycles.use_denoising = os.environ.get("DENOISE", "1") == "1"
r.resolution_x, r.resolution_y = int(os.environ.get("RES_X", 1600)), int(os.environ.get("RES_Y", 900))
scene.view_settings.view_transform = "AgX"
for mood in MOODS if os.environ.get("RENDER", "1") == "1" else []:  # bake.py builds the scene without rendering
    set_mood(mood)
    for cam_name in os.environ.get("CAMS", "home").split(","):
        scene.camera = cams[cam_name]
        r.filepath = f"{OUT}/{cam_name}_{mood}.png"
        bpy.ops.render.render(write_still=True)
if os.environ.get("RENDER", "1") == "1":
    bpy.ops.wm.save_as_mainfile(filepath=f"{OUT}/scene.blend")
