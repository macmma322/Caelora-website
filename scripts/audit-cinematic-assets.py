"""Read-only workstation audit. Run with Blender --background --disable-autoexec."""
import bpy
import json
import sys
from pathlib import Path

SOURCES = [
    r'D:/Caelora/art/creatures/bonds/wolf/source/WOLF_Blockfur_v01.blend',
    r'D:/Caelora/art/creatures/bonds/falcon/source/FALCON_Block_v01.blend',
    r'D:/Caelora/art/creatures/bonds/direwolf/source/DIREWOLF_Shardfang_v01.blend',
    r'D:/Caelora/art/equipment/generated_player_assets/source/EQP_Ascendant_Emberwing.blend',
    r'D:/Caelora/art/characters/wings/CHR_Ascendant_Feathered_Wings.blend',
    r'D:/Caelora-source-assets/Environment/FirstValley-Branch-b7fcd404/blender/ENV_Village_Kit.blend',
    r'D:/Caelora-source-assets/Environment/FirstValley-Branch-b7fcd404/blender/ENV_FirstValley_Master.blend',
    r'D:/Caelora-source-assets/Environment/FirstValley-Branch-b7fcd404/blender/ENV_Ruin_Kit.blend',
    r'D:/Caelora/art/animations/humanoid/locomotion_v01/source/locomotion_v01.blend',
]
output = Path(sys.argv[sys.argv.index('--') + 1])
output.parent.mkdir(parents=True, exist_ok=True)
records = []
for source in SOURCES:
    if not Path(source).is_file():
        records.append({'source': source, 'missing': True})
        continue
    bpy.ops.wm.open_mainfile(filepath=source, load_ui=False, use_scripts=False)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    record = {
        'source': source,
        'bytes': Path(source).stat().st_size,
        'meshes': [{'name': obj.name, 'vertices': len(obj.data.vertices),
                    'triangles': sum(max(0, len(p.vertices) - 2) for p in obj.data.polygons),
                    'materials': [m.name if m else None for m in obj.data.materials],
                    'modifiers': [m.type for m in obj.modifiers]} for obj in meshes],
        'armatures': [{'name': obj.name, 'bones': len(obj.data.bones)}
                      for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'],
        'actions': [{'name': action.name, 'frames': list(action.frame_range)} for action in bpy.data.actions],
        'images': [{'name': image.name, 'size': list(image.size), 'packed': bool(image.packed_file),
                    'path': image.filepath} for image in bpy.data.images if image.type == 'IMAGE'],
    }
    records.append(record)
    output.write_text(json.dumps(records, indent=2), encoding='utf-8')
    print('AUDITED', source, 'meshes', len(meshes), 'rigs', len(record['armatures']), 'actions', len(record['actions']), flush=True)
# Never save a source file.
