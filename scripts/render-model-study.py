import bpy, sys, math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
output=Path(args[0]); output.parent.mkdir(parents=True,exist_ok=True)
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH']
points=[o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
low=Vector([min(p[i] for p in points) for i in range(3)]); high=Vector([max(p[i] for p in points) for i in range(3)])
center=(low+high)/2; extent=max(high-low)
for o in list(scene.objects):
    if o.type in {'CAMERA','LIGHT'}: bpy.data.objects.remove(o,do_unlink=True)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Caelora studio world');scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(0.24,0.28,0.29,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=0.5
cam=bpy.data.objects.new('Website study camera',bpy.data.cameras.new('Website study camera'));scene.collection.objects.link(cam);scene.camera=cam
cam.location=center+Vector((-3,-5,2.1))*extent;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent*1.55;cam.data.lens=50
for name,position,energy,size,color in [('warm key',(-3,-4,5),700,4,(1,0.85,0.67)),('sky fill',(4,-1,3),500,3,(0.65,0.8,1)),('rim',(1,4,4),900,3,(1,0.77,0.47))]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=center+Vector(position)*extent;obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=0.3
scene.render.filepath=str(output.resolve());bpy.ops.render.render(write_still=True)
print('CAELORA_RENDER_COMPLETE='+str(output))
# Deliberately no save_as_mainfile: source blend and packed images stay unchanged.

