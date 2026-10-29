# Step 3: bake each lighting mood into texture atlases and export the web assets.
# Run: ~/.bpy-venv/bin/python blender/bake.py -- <web_public_dir> [mood ...]
# Output: room.glb, maxel.glb, bake/<group>_<mood>.webp, hotspots.json
import os, sys, json, math, runpy
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:]
PUB, MOODS = args[0], args[1:] or ["golden", "afternoon", "overcast", "evening", "night"]
os.makedirs(f"{PUB}/bake", exist_ok=True)
os.environ["RENDER"] = "0"
sys.argv = ["scene.py", "--", PUB]
g = runpy.run_path(f"{HERE}/scene.py")
import bpy
from mathutils import Vector

scene, set_mood = bpy.context.scene, g["set_mood"]
SIZES = {"shell": int(os.environ.get("SHELL_PX", 1024)), "props": int(os.environ.get("PROPS_PX", 2048))}
SCALE = 3.0  # baked radiance is stored as (value / SCALE) in sRGB; the shader multiplies it back
scene.cycles.samples = int(os.environ.get("SAMPLES", 128))

# ---------- sort objects ----------
maxel_root = bpy.data.objects["scene.gltf"]
maxel_parts = set(maxel_root.children_recursive)
SCREENS = {"monitor_screen", "laptop_screen", "phone_screen"}
DECALS = {"whey_label", "desk_mat"}
DYNAMIC = {"globe"} | SCREENS | DECALS
SHELL = ("wall", "floor", "skirting", "lwall_")

# hotspots: world bounding boxes of the clickable things, for hit boxes and camera moves in the browser
HOTSPOTS = {"monitor": ["monitor_screen"], "laptop": ["laptop_screen"], "phone": ["phone_screen"], "chess": ["chess_frame"],
            "globe": ["globe", "globe_base", "globe_meridian"], "gym": ["whey_tub", "whey_lid", "dumbbell_plate"],
            "story": ["story_frame"], "lamp": ["lamp_shade_top", "lamp_shade_low"],
            "maxel": [o.name for o in maxel_parts if o.type == "MESH" and o.name != "Icosphere"]}
bpy.context.view_layer.update()

def bbox(names):
    pts = [o.matrix_world @ Vector(c) for o in scene.objects if o.type == "MESH" and (o.name in names or o.name.split(".")[0] in names) for c in o.bound_box]
    lo, hi = [min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]
    return {"center": [(a + b) / 2 for a, b in zip(lo, hi)], "size": [b - a for a, b in zip(lo, hi)]}

hotspots = {k: bbox(v) for k, v in HOTSPOTS.items()}

# ---------- merge static geometry into two meshes ----------
def select(objs, active):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active

static = [o for o in scene.objects if o.type in ("MESH", "CURVE") and o not in maxel_parts and o.name not in DYNAMIC]
for o in static:
    o.parent = None if o.parent and o.parent.type == "EMPTY" else o.parent
select(static, static[0])
bpy.ops.object.convert(target="MESH")  # applies bevel/solidify modifiers and turns stems into meshes
static = [o for o in bpy.context.selected_objects]
groups = {"shell": [o for o in static if o.name.startswith(SHELL)], "props": [o for o in static if not o.name.startswith(SHELL)]}
for name, objs in groups.items():
    select(objs, objs[0])
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    for uv in list(o.data.uv_layers):  # textured parts keep "UVMap" for rendering; the atlas gets its own layer
        if uv.name != "UVMap":
            o.data.uv_layers.remove(uv)
    if not o.data.uv_layers:
        o.data.uv_layers.new(name="UVMap")
    bake_uv = o.data.uv_layers.new(name="bake")
    o.data.uv_layers.active = bake_uv
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0)
    bpy.ops.uv.pack_islands(rotate=True, margin=0.004, shape_method="CONCAVE")
    bpy.ops.object.mode_set(mode="OBJECT")
    uvs = np.empty(len(o.data.loops) * 2, dtype=np.float32); bake_uv.data.foreach_get("uv", uvs)
    print("uv bounds", name, uvs.reshape(-1, 2).min(0), uvs.reshape(-1, 2).max(0), flush=True)
    o.data.uv_layers["UVMap"].active_render = True
    groups[name] = o

# ---------- bake ----------
# the bake keeps only diffuse light, so metals would come out black: bake them as matte paint of the same colour
for m in bpy.data.materials:
    p = m.node_tree.nodes.get("Principled BSDF") if m.use_nodes else None
    if p and p.inputs["Metallic"].default_value > 0.5:
        p.inputs["Metallic"].default_value = 0.0
bk = scene.render.bake
bk.use_pass_direct = bk.use_pass_indirect = bk.use_pass_diffuse = bk.use_pass_emit = True
bk.use_pass_glossy = bk.use_pass_transmission = False
bk.margin = 6

def target_node(mat):
    nt = mat.node_tree
    n = nt.nodes.get("bake_target") or nt.nodes.new("ShaderNodeTexImage")
    n.name = "bake_target"
    nt.nodes.active = n
    return n

# denoising happens in an empty scene's compositor (OIDN), so it costs a near-empty render
den = bpy.data.scenes.new("denoise"); den.render.engine = "CYCLES"; den.cycles.samples = 1
den.use_nodes = True; nt = den.node_tree; nt.nodes.clear()
img_node, dn, comp = nt.nodes.new("CompositorNodeImage"), nt.nodes.new("CompositorNodeDenoise"), nt.nodes.new("CompositorNodeComposite")
dn.use_hdr = True
nt.links.new(img_node.outputs["Image"], dn.inputs["Image"]); nt.links.new(dn.outputs["Image"], comp.inputs["Image"])
den.render.image_settings.file_format = "OPEN_EXR"; den.render.image_settings.color_depth = "32"
den.view_settings.view_transform = "Standard"

def denoise(img, path):
    img_node.image = img
    den.render.resolution_x = den.render.resolution_y = img.size[0]
    den.render.resolution_percentage = 100
    den.render.filepath = path
    bpy.ops.render.render(scene=den.name, write_still=True)
    out = bpy.data.images.load(path)
    px = np.empty(len(out.pixels), dtype=np.float32); out.pixels.foreach_get(px)
    bpy.data.images.remove(out)
    return px.reshape(img.size[1], img.size[0], 4)[::-1, :, :3]  # top row first

for mood in MOODS:
    set_mood(mood)
    for gname, o in groups.items():
        img = bpy.data.images.new(f"{gname}_{mood}", SIZES[gname], SIZES[gname], float_buffer=True)
        for slot in o.material_slots:
            target_node(slot.material).image = img
        select([o], o)
        bpy.ops.object.bake(type="COMBINED", uv_layer="bake", margin=6)
        rgb = denoise(img, f"{PUB}/bake/_tmp.exr")
        srgb = np.clip(rgb / SCALE, 0, 1) ** (1 / 2.2)
        Image.fromarray((srgb * 255 + 0.5).astype(np.uint8)).save(f"{PUB}/bake/{gname}_{mood}.webp", quality=88)
        bpy.data.images.remove(img)
        print("baked", gname, mood, flush=True)
os.remove(f"{PUB}/bake/_tmp.exr")

# ---------- export ----------
for o in groups.values():  # the browser only needs the atlas UVs and one material slot per mesh
    o.data.uv_layers.remove(o.data.uv_layers["UVMap"])
    o.data.materials.clear()
    o.data.materials.append(bpy.data.materials.new(o.name))
room = list(groups.values()) + [bpy.data.objects[n] for n in DYNAMIC]
select(room, room[0])
bpy.ops.export_scene.gltf(filepath=f"{PUB}/room.glb", use_selection=True, export_apply=True, export_yup=True,
                          export_image_format="WEBP", export_cameras=False, export_lights=False)

for img in {n.image for o in maxel_parts if o.type == "MESH" for s in o.material_slots for n in s.material.node_tree.nodes if n.type == "TEX_IMAGE"}:
    img.scale(512, 512)
select([maxel_root, *maxel_parts], maxel_root)
bpy.ops.export_scene.gltf(filepath=f"{PUB}/maxel.glb", use_selection=True, export_yup=True, export_image_format="WEBP",
                          export_animations=True, export_cameras=False, export_lights=False)

# Blender is Z-up; the browser is Y-up (x, z, -y)
to_web = lambda v: [v[0], v[2], -v[1]]
json.dump({k: {"center": to_web(h["center"]), "size": [h["size"][0], h["size"][2], h["size"][1]]} for k, h in hotspots.items()},
          open(f"{PUB}/hotspots.json", "w"), indent=1)
print("exported", flush=True)
