# Web derivative of the premium Crimson Regent cloak, for the Hearth page's 3D study.
# Run from the repository root:
#   blender -b --factory-startup -P scripts/export-web-cloak.py
#   cd artifacts/crimson-regent && npx gltfpack@0.25.0 -i cloak.gltf -o ../../apps/web/public/models/crimson-regent/cloak.gltf -kn -tr
#   cp *.webp ../../apps/web/public/models/crimson-regent/
# gltfpack quantises the mesh (KHR_mesh_quantization, no WebAssembly). Textures stay separate
# WebP files: the site CSP forbids wasm (meshopt) and blob: fetches (GLB-embedded images).
# Source: the accepted game asset (skinned to RIG_Athletic_Male's Chest/Neck/Cloak_* chain).
# Output keeps only the bones the cloak is weighted to, so the browser can run the same
# spring chain the game does. Shape keys (OverPack) are dropped: there is no backpack here.
import bpy

GAME = r"D:\Caelora\game-client\Assets\Caelora\Equipment\Premium"
SOURCE = GAME + r"\Meshes\PREM_Crimson_Regent_Cloak.fbx"
TEXTURES = GAME + r"\Textures\CrimsonRegent"
OUT = r"artifacts\crimson-regent\cloak.gltf"
TRIANGLES = 24000
TEXTURE_SIZE = 1024
KEEP = {"Root", "Pelvis", "Spine_01", "Spine_02", "Chest", "Neck"}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SOURCE)
mesh = next(o for o in bpy.data.objects if o.type == "MESH")
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")

# Shape keys block the decimate modifier; the basis is the plain cloak.
mesh.shape_key_clear()
bpy.context.view_layer.objects.active = mesh
decimate = mesh.modifiers.new("web", "DECIMATE")
decimate.ratio = TRIANGLES / len(mesh.data.polygons)
bpy.ops.object.modifier_apply(modifier=decimate.name)

# Drop bones the cloak is not weighted to (arms, legs, sockets, head).
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
for bone in list(rig.data.edit_bones):
    if bone.name not in KEEP and not bone.name.startswith("Cloak_"):
        rig.data.edit_bones.remove(bone)
bpy.ops.object.mode_set(mode="OBJECT")

# PBR material from the game's texture set, downsized for the web.
material = bpy.data.materials.new("CrimsonRegent")
material.use_nodes = True
nodes, links = material.node_tree.nodes, material.node_tree.links
shader = nodes["Principled BSDF"]


def texture(role, colour):
    image = bpy.data.images.load(TEXTURES + "\\" + role + ".png")
    image.scale(TEXTURE_SIZE, TEXTURE_SIZE)
    if not colour:
        image.colorspace_settings.name = "Non-Color"
    node = nodes.new("ShaderNodeTexImage")
    node.image = image
    return node


links.new(texture("BaseColor", True).outputs["Color"], shader.inputs["Base Color"])
links.new(texture("Roughness", False).outputs["Color"], shader.inputs["Roughness"])
normal = nodes.new("ShaderNodeNormalMap")
links.new(texture("Normal", False).outputs["Color"], normal.inputs["Color"])
links.new(normal.outputs["Normal"], shader.inputs["Normal"])
shader.inputs["Metallic"].default_value = 0.0
mesh.data.materials.clear()
mesh.data.materials.append(material)

bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLTF_SEPARATE",
    export_image_format="WEBP",
    export_image_quality=82,
    export_skins=True,
    export_animations=False,
    export_morph=False,
    export_tangents=False,
    export_extras=False,
)
print("CLOAK>", len(mesh.data.polygons), "faces,", len(rig.data.bones), "bones")
