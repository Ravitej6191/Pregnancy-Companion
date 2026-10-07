"""
Generates KS Heart launcher icons for all Android mipmap densities.
Requires: pip install Pillow
Run: python generate_icons.py
"""
import struct, zlib, math, os

# ── Pure-Python PNG writer (no dependencies) ─────────────────────────────────

def _pack_chunk(chunk_type, data):
    c = chunk_type + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

def write_png(path, pixels, width, height):
    """pixels: flat list of (r,g,b,a) tuples, row-major."""
    raw = []
    for y in range(height):
        raw.append(b'\x00')
        for x in range(width):
            r,g,b,a = pixels[y*width+x]
            raw.append(bytes([r,g,b,a]))
    compressed = zlib.compress(b''.join(raw), 9)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(_pack_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2|1, 0, 0, 0)))  # RGBA
        f.write(_pack_chunk(b'IDAT', compressed))
        f.write(_pack_chunk(b'IEND', b''))

def write_png_rgba(path, pixels, width, height):
    raw = bytearray()
    header = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # colortype=6 = RGBA
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            r,g,b,a = pixels[y*width+x]
            raw += bytes([r,g,b,a])
    compressed = zlib.compress(bytes(raw), 9)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(_pack_chunk(b'IHDR', header))
        f.write(_pack_chunk(b'IDAT', compressed))
        f.write(_pack_chunk(b'IEND', b''))

# ── Rendering helpers ─────────────────────────────────────────────────────────

def lerp(a, b, t): return a + (b-a)*t
def clamp(v, lo=0, hi=255): return max(lo, min(hi, int(v)))

def blend(bg, fg):
    """Alpha-composite fg over bg. All channels 0-255."""
    br,bg_,bb,ba = bg
    fr,fg_,fb,fa = fg
    fa_n = fa/255.0
    ba_n = ba/255.0
    oa = fa_n + ba_n*(1-fa_n)
    if oa < 1e-6:
        return (0,0,0,0)
    or_ = (fr*fa_n + br*ba_n*(1-fa_n))/oa
    og_ = (fg_*fa_n + bg_*ba_n*(1-fa_n))/oa
    ob_ = (fb*fa_n + bb*ba_n*(1-fa_n))/oa
    return (clamp(or_), clamp(og_), clamp(ob_), clamp(oa*255))

def sdf_circle(cx, cy, r, px, py):
    dx, dy = px-cx, py-cy
    return r - math.sqrt(dx*dx+dy*dy)

def sdf_rounded_rect(cx, cy, hw, hh, r, px, py):
    qx = abs(px-cx)-hw+r
    qy = abs(py-cy)-hh+r
    return r - (math.sqrt(max(qx,0)**2+max(qy,0)**2) + min(max(qx,qy),0))

def sdf_heart(cx, cy, scale, px, py):
    """Heart SDF — returns positive inside heart."""
    x = (px-cx)/scale
    y = -(py-cy)/scale   # flip y for math convention
    # Heart: shifted so tip is at bottom
    y -= 0.25
    x2, y2 = x*x, y*y
    # Classic algebraic heart: (x^2 + y^2 - 1)^3 - x^2*y^3 < 0 inside heart
    v = (x2+y2-1)**3 - x2*(y**3)
    return -v * (scale**6) * 1e-3  # scale to pixel-ish units

def aa_step(sdf, feather=1.2):
    """Smooth step for anti-aliasing."""
    return max(0.0, min(1.0, sdf/feather + 0.5))

def stroke_segment(ax,ay,bx,by, px,py, half_w):
    """Distance from point (px,py) to line segment (ax,ay)-(bx,by)."""
    dx,dy = bx-ax, by-ay
    l2 = dx*dx+dy*dy
    if l2 < 1e-9: return math.sqrt((px-ax)**2+(py-ay)**2)
    t = max(0,min(1,((px-ax)*dx+(py-ay)*dy)/l2))
    return math.sqrt((px-ax-t*dx)**2+(py-ay-t*dy)**2)

def cubic_bezier_dist(p0,p1,p2,p3, px,py, steps=20):
    """Approximate min distance from point to cubic bezier."""
    best = float('inf')
    for i in range(steps+1):
        t = i/steps
        mt = 1-t
        bx = mt**3*p0[0]+3*mt**2*t*p1[0]+3*mt*t**2*p2[0]+t**3*p3[0]
        by = mt**3*p0[1]+3*mt**2*t*p1[1]+3*mt*t**2*p2[1]+t**3*p3[1]
        d = math.sqrt((px-bx)**2+(py-by)**2)
        if d < best: best = d
    return best

# ── Draw one icon ─────────────────────────────────────────────────────────────

def draw_icon(size):
    """Draw the KS heart icon at the given square pixel size."""
    pixels = [(0,0,0,0)] * (size*size)
    s = size
    cx, cy = s/2, s/2
    radius = s * 0.22   # border radius for squircle

    # Gradient: top-left #FF8FAB → bottom-right #F76E8C
    c1 = (255,143,171)
    c2 = (247,110,140)

    # Heart scale in "local" heart units → pixel space
    heart_scale = s * 0.38

    # Line widths in pixels
    stroke_w = s * 0.072

    for y in range(s):
        for x in range(s):
            # 1. Rounded-rect mask (icon shape)
            mask_sdf = sdf_rounded_rect(cx,cy, cx,cy, radius, x+0.5,y+0.5)
            mask = aa_step(mask_sdf)
            if mask < 0.01:
                continue

            # 2. Background gradient
            t = ((x+y)/(2*s))
            r = clamp(lerp(c1[0],c2[0],t))
            g = clamp(lerp(c1[1],c2[1],t))
            b = clamp(lerp(c1[2],c2[2],t))
            bg = (r,g,b,clamp(mask*255))

            # 3. Heart watermark (filled, 28% white opacity)
            heart_d = sdf_heart(cx, cy*0.95, heart_scale, x+0.5, y+0.5)
            heart_a = aa_step(heart_d) * 0.28
            pixel = blend(bg, (255,255,255,clamp(heart_a*255)))

            # 4. KS strokes (white, fully opaque)
            # Normalise coords relative to center
            nx, ny = (x+0.5)/s, (y+0.5)/s
            # K: vertical stem x=0.245, y=0.28-0.72
            # K: upper arm (0.245,0.5)→(0.44,0.28)
            # K: lower arm (0.245,0.5)→(0.44,0.72)
            # S: bezier from x≈0.55 to x≈0.75 (two arcs)
            half_w = stroke_w / 2

            def letter_alpha(dist):
                return aa_step(half_w - dist)

            # K stem
            d = stroke_segment(0.245,0.28, 0.245,0.72, nx,ny, 0)
            ka = letter_alpha(d * s)
            # K upper arm
            d2 = stroke_segment(0.245,0.50, 0.44,0.28, nx,ny, 0)
            ka = max(ka, letter_alpha(d2*s))
            # K lower arm
            d3 = stroke_segment(0.245,0.50, 0.44,0.72, nx,ny, 0)
            ka = max(ka, letter_alpha(d3*s))

            # S upper arc: start (0.745,0.35) → ctrl (0.745,0.27) (0.56,0.27) → end (0.56,0.37)
            sa = cubic_bezier_dist(
                (0.745,0.35),(0.745,0.27),(0.56,0.27),(0.56,0.37),
                nx, ny, 24)
            sa = letter_alpha(sa*s)
            # S lower arc: start (0.56,0.37) → ctrl (0.56,0.47) (0.745,0.52) → (0.745,0.52)
            sb = cubic_bezier_dist(
                (0.56,0.50),(0.56,0.65),(0.745,0.65),(0.745,0.63),
                nx, ny, 24)
            sb = letter_alpha(sb*s)
            # S middle bridge (straight)
            sm = stroke_segment(0.56,0.50, 0.745,0.50, nx,ny, 0)
            sm = letter_alpha(sm*s) * 0.0   # not drawn — bezier handles it
            letter_a = max(ka, sa, sb)

            if letter_a > 0.01:
                pixel = blend(pixel, (255,255,255,clamp(letter_a*255)))

            pixels[y*s+x] = pixel

    return pixels

# ── Output sizes ─────────────────────────────────────────────────────────────

DENSITIES = {
    'mipmap-mdpi':    48,
    'mipmap-hdpi':    72,
    'mipmap-xhdpi':   96,
    'mipmap-xxhdpi':  144,
    'mipmap-xxxhdpi': 192,
}

BASE = os.path.join(os.path.dirname(__file__),
    'android', 'app', 'src', 'main', 'res')

print('Generating KS Heart launcher icons...')
for density, size in DENSITIES.items():
    folder = os.path.join(BASE, density)
    os.makedirs(folder, exist_ok=True)
    pixels = draw_icon(size)
    for fname in ('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'):
        path = os.path.join(folder, fname)
        write_png_rgba(path, pixels, size, size)
        print(f'  OK {density}/{fname} ({size}x{size})')

print('\nDone! Now do a Clean Build in Android Studio.')
