"""Trace the approved W asset to paths, preserving its palette and transparency.
Optional authoring dependency: vtracer==0.6.12. Not needed by the web app.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import vtracer

BASE = Path(__file__).resolve().parent.parent
output = BASE / 'assets/tradeweave-mark.svg'
vtracer.convert_image_to_svg_py(
    str(BASE / 'assets/tradeweave-mark-v2.png'), str(output),
    colormode='color', hierarchical='stacked', mode='spline',
    filter_speckle=64, color_precision=3, layer_difference=64,
    corner_threshold=60, length_threshold=5.0, max_iterations=10,
    splice_threshold=45, path_precision=2,
)
ET.register_namespace('', 'http://www.w3.org/2000/svg')
root = ET.fromstring(output.read_text())
root.set('viewBox', '0 0 1312 1199')
# The tracer repeats fully opaque contours. Keep their final painted instance.
seen = set()
for path in reversed(list(root)):
    key = (path.get('d'), path.get('transform'))
    if key in seen:
        root.remove(path)
    else:
        seen.add(key)
output.write_text(ET.tostring(root, encoding='unicode'))
print(f'{len(root)} paths, {output.stat().st_size:,} bytes; no embedded raster')
