# Step 1 layout: grey-box room matching Deepesh's desk photo. Blender: X right, Y into the wall, Z up; wall at y=0, metres.
# Run: blender -b -P blender/blockout.py -- <out_dir> <bull_terrier.glb>
import bpy, sys, json, math
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

out, DOG = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

WALL, FLOOR, DESK, LEG = (0.93, 0.91, 0.87, 1), (0.30, 0.19, 0.12, 1), (0.95, 0.95, 0.94, 1), (0.55, 0.56, 0.58, 1)
OAK, BLACK, GREEN, WHITE = (0.80, 0.68, 0.50, 1), (0.06, 0.06, 0.07, 1), (0.30, 0.55, 0.22, 1), (0.97, 0.97, 0.96, 1)
SCREEN, GREY = (0.10, 0.18, 0.35, 1), (0.45, 0.46, 0.48, 1)

def box(name, size, loc, color, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.name, o.scale, o.color = name, (size[0] / 2, size[1] / 2, size[2] / 2), color
    return o

def cyl(name, r, h, loc, color, r2=None, rot=(0, 0, 0)):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, rotation=rot, vertices=32)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=h, location=loc, rotation=rot, vertices=32)
    o = bpy.context.object
    o.name, o.color = name, color
    return o

def blob(name, r, loc, color, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=r, location=loc, subdivisions=2)
    o = bpy.context.object
    o.name, o.color, o.scale = name, color, scale
    return o

# room
box("wall", (9, 0.02, 3), (0, 0.01, 1.5), WALL)
box("floor", (9, 4, 0.02), (0, -2, -0.01), FLOOR)

# desk (120x60-ish, white top, grey legs)
TOP = 0.75
box("desk_top", (1.45, 0.62, 0.03), (0.1, -0.31, TOP - 0.015), DESK)
for x in (-0.6, 0.8):
    for y in (-0.04, -0.58):
        box("desk_leg", (0.04, 0.04, TOP - 0.03), (x, y, (TOP - 0.03) / 2), LEG)
box("desk_mat", (0.85, 0.32, 0.004), (0.05, -0.42, TOP + 0.002), BLACK)

# main monitor (27", projects)
box("monitor_screen", (0.62, 0.025, 0.37), (0.0, -0.13, TOP + 0.33), SCREEN)
box("monitor_neck", (0.04, 0.03, 0.15), (0.0, -0.11, TOP + 0.075), BLACK)
cyl("monitor_base", 0.11, 0.01, (0.0, -0.14, TOP + 0.005), BLACK)

# laptop on stand (about me + education)
box("laptop_stand", (0.26, 0.22, 0.12), (0.6, -0.2, TOP + 0.06), GREY, rot=(math.radians(-12), 0, 0))
box("laptop_base", (0.36, 0.25, 0.02), (0.6, -0.22, TOP + 0.13), BLACK, rot=(math.radians(-12), 0, 0))
box("laptop_screen", (0.36, 0.015, 0.23), (0.6, -0.08, TOP + 0.27), SCREEN, rot=(math.radians(-8), 0, 0))

# desk items
box("keyboard", (0.44, 0.14, 0.025), (0.12, -0.44, TOP + 0.015), BLACK)
box("mouse", (0.06, 0.11, 0.035), (0.46, -0.44, TOP + 0.02), BLACK)
box("phone", (0.075, 0.155, 0.009), (0.6, -0.45, TOP + 0.006), BLACK, rot=(0, 0, math.radians(-8)))
box("tablet", (0.3, 0.22, 0.008), (-0.36, -0.36, TOP + 0.004), (0.15, 0.17, 0.25, 1))
blob("headphones", 0.07, (-0.36, -0.36, TOP + 0.04), BLACK, (1.3, 1.0, 0.35))

# floor lamp with two white shades (light presets)
cyl("lamp_base", 0.13, 0.02, (-0.74, -0.15, 0.01), WHITE)
cyl("lamp_pole", 0.012, 1.72, (-0.74, -0.15, 0.86), (0.8, 0.8, 0.8, 1))
cyl("lamp_shade_top", 0.11, 0.16, (-0.64, -0.17, 1.62), WHITE, r2=0.07, rot=(0, math.radians(-110), 0))
cyl("lamp_shade_low", 0.11, 0.16, (-0.85, -0.2, 1.38), WHITE, r2=0.07, rot=(0, math.radians(110), 0))

# side table with flower pot (left, from photo)
box("side_table", (0.38, 0.38, 0.5), (-1.15, -0.3, 0.25), WHITE)
cyl("flower_pot", 0.08, 0.14, (-1.15, -0.3, 0.57), WHITE)
blob("flower", 0.13, (-1.15, -0.3, 0.75), (0.85, 0.80, 0.55, 1))

# wall shelf: 3 open cubes, light oak
SX0, CW, SB, SH, SD = -0.25, 0.4, 1.40, 0.42, 0.3
box("shelf_bottom", (3 * CW, SD, 0.02), (SX0 + 1.5 * CW, -SD / 2, SB), OAK)
box("shelf_top", (3 * CW, SD, 0.02), (SX0 + 1.5 * CW, -SD / 2, SB + SH), OAK)
for i in range(4):
    box("shelf_side", (0.02, SD, SH), (SX0 + i * CW, -SD / 2, SB + SH / 2), OAK)
cyl("whey_tub", 0.07, 0.2, (SX0 + 0.13, -0.15, SB + 0.11), BLACK)
box("dumbbell_bar", (0.2, 0.025, 0.025), (SX0 + 0.29, -0.17, SB + 0.04), GREY)
for dx in (-0.08, 0.08):
    cyl("dumbbell_plate", 0.035, 0.03, (SX0 + 0.29 + dx, -0.17, SB + 0.045), BLACK, rot=(0, math.radians(90), 0))
for i in range(5):
    box("book", (0.03, 0.2, 0.22 + 0.02 * (i % 3)), (SX0 + CW + 0.1 + 0.035 * i, -0.13, SB + 0.12 + 0.01 * (i % 3)), (0.2 + 0.1 * i, 0.25, 0.4, 1))
box("maxel_treat_bag", (0.2, 0.12, 0.3), (SX0 + 2.5 * CW, -0.14, SB + 0.16), (0.45, 0.75, 0.72, 1))

# plants on top of the shelf: money plant (with trailing vine), middle plant, spider plant
top = SB + SH + 0.01
cyl("pot_money_plant", 0.07, 0.12, (-0.15, -0.15, top + 0.06), (0.65, 0.33, 0.20, 1))
blob("money_plant", 0.14, (-0.17, -0.15, top + 0.22), GREEN, (1.2, 0.9, 0.9))
cyl("pot_middle", 0.08, 0.14, (0.25, -0.15, top + 0.07), WHITE)
blob("middle_plant", 0.2, (0.25, -0.15, top + 0.33), (0.35, 0.5, 0.25, 1), (1, 0.8, 1.3))
cyl("pot_spider_plant", 0.07, 0.12, (0.52, -0.15, top + 0.06), (0.7, 0.72, 0.74, 1))
blob("spider_plant", 0.18, (0.55, -0.15, top + 0.2), (0.45, 0.65, 0.3, 1), (1.6, 0.9, 0.7))
for i in range(9):  # vine trailing from the money plant down towards the lamp
    t = i / 8
    blob("vine_leaf", 0.03, (-0.25 - 0.55 * t, -0.05, top + 0.05 - 0.75 * t + 0.15 * math.sin(t * 3)), GREEN)

# world map with country pins, along the top of the wall
box("world_map", (2.4, 0.015, 0.55), (0.1, -0.01, 2.5), (0.55, 0.62, 0.70, 1))
for i, (dx, dz) in enumerate([(-0.05, 0.08), (-0.02, 0.1), (-0.08, 0.05), (0.0, 0.12), (0.55, -0.05)]):
    blob(f"map_pin_{i}", 0.014, (0.1 + dx, -0.03, 2.5 + dz), (0.85, 0.15, 0.15, 1))

# vertical wall chessboard (Julia style), upper left
box("chessboard", (0.42, 0.03, 0.42), (-1.05, -0.02, 1.8), (0.55, 0.40, 0.25, 1))
for i, (dx, dz) in enumerate([(-0.12, -0.12), (0.0, -0.12), (0.08, 0.04), (-0.04, 0.12), (0.12, 0.08)]):
    cyl(f"chess_piece_{i}", 0.014, 0.05, (-1.05 + dx, -0.06, 1.8 + dz), WHITE if i < 3 else BLACK, rot=(math.radians(90), 0, 0))

# cork story board for the lanyards (right wall)
box("story_board", (0.7, 0.025, 0.55), (1.45, -0.015, 1.5), (0.72, 0.55, 0.36, 1))
# Maxel: kenchoo's CC-BY bull terrier (recoloured in step 2)
before = set(scene.objects)
bpy.ops.import_scene.gltf(filepath=DOG)
bpy.data.objects.remove(bpy.data.objects["Icosphere"])
maxel = bpy.data.objects.new("maxel", None)
scene.collection.objects.link(maxel)
for o in set(scene.objects) - before:
    if o.parent is None and o is not maxel:
        o.parent = maxel
    o.color = (0.55, 0.33, 0.18, 1)
maxel.location, maxel.rotation_euler, maxel.scale = (1.2, -0.45, 0), (0, 0, math.radians(-25)), (1.3, 1.3, 1.3)
maxel_head = bpy.data.objects.new("maxel_head", None)
maxel_head.location = (1.13, -0.62, 0.36)
scene.collection.objects.link(maxel_head)

# company lanyards pinned on the story board
for i, (name, col) in enumerate([("fraunhofer", (0.09, 0.61, 0.49, 1)), ("gdg", (0.26, 0.52, 0.96, 1)),
                                 ("isg", (0.85, 0.45, 0.15, 1)), ("asv", (0.75, 0.15, 0.2, 1))]):
    x = 1.2 + 0.165 * i
    blob(f"pin_{name}", 0.012, (x, -0.04, 1.72), (0.85, 0.15, 0.15, 1))
    box(f"lanyard_strap_{name}", (0.012, 0.004, 0.22), (x, -0.04, 1.6), col)
    box(f"lanyard_card_{name}", (0.1, 0.006, 0.14), (x, -0.045, 1.43), WHITE)

# camera (16:9, fixed like Julia's)
bpy.ops.object.camera_add(location=(0.15, -3.55, 1.4))
cam = bpy.context.object
cam.data.sensor_fit, cam.data.angle_y = "VERTICAL", math.radians(49)
cam.rotation_euler = (Vector((0.15, 0, 1.32)) - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

scene.render.engine = "BLENDER_WORKBENCH"
sh = scene.display.shading
sh.light, sh.color_type, sh.show_shadows, sh.show_cavity = "STUDIO", "OBJECT", True, True
scene.display.shadow_shift = 0.2
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
scene.render.filepath = f"{out}/blockout.png"
bpy.ops.render.render(write_still=True)

# label anchors for the annotated version
labels = {"Monitor: projects": "monitor_screen", "Laptop: about me + education": "laptop_screen",
          "Phone: talk with me": "phone", "Chessboard: Chess.com": "chessboard", "Headphones + tablet": "headphones", "Lamp: light moods": "lamp_shade_top",
          "World map: travel": "world_map", "Whey + dumbbell: gym": "whey_tub", "Maxel (kenchoo model)": "maxel_head",
          "Story board + lanyards": "story_board", "Treat bag: ask Maxel": "maxel_treat_bag"}
pts = {}
for label, obj in labels.items():
    p = world_to_camera_view(scene, cam, bpy.data.objects[obj].location)
    pts[label] = (p.x * 1600, (1 - p.y) * 900)
json.dump(pts, open(f"{out}/labels.json", "w"))
bpy.ops.wm.save_as_mainfile(filepath=f"{out}/blockout.blend")
